import Anthropic from "@anthropic-ai/sdk";
import type { AiConfig } from "./config";
import type { ChatMessage } from "./client";
import type { WebSource } from "./fill-format";

/**
 * Claude through Anthropic's own Messages API. The model is whatever the
 * provider settings name, so requests stick to what every Claude model
 * accepts: no sampling parameters and no thinking configuration (current
 * models reject the former and choose the latter themselves).
 */

const NON_STREAMING_MAX_TOKENS = 16000;
const STREAMING_MAX_TOKENS = 32000;
const MAX_CONTINUATIONS = 4;
const WEB_SEARCH_MAX_USES = 6;

const client = (config: AiConfig) =>
  new Anthropic({
    apiKey: config.apiKey ?? "",
    ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
  });

/** The system prompt travels apart from the conversation. */
const split = (messages: ChatMessage[]) => ({
  system:
    messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n") || undefined,
  messages: messages
    .filter((m) => m.role !== "system")
    .map(
      (m): Anthropic.MessageParam => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }),
    ),
});

/** Turns SDK errors into the short messages the UI shows. */
const failure = (error: unknown, signal?: AbortSignal): unknown => {
  if (signal?.aborted) return error;
  if (error instanceof Anthropic.AuthenticationError) {
    return new Error("Anthropic rejected the API key. Check it in Settings › AI.");
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return new Error(
      `Anthropic refused the request: ${error.message}. The key may not have access to this model or to web search.`,
    );
  }
  if (error instanceof Anthropic.NotFoundError) {
    return new Error(
      "Anthropic does not know this model. Check the model name in Settings › AI.",
    );
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new Error("Anthropic's rate limit was reached. Try again shortly.");
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new Error("Could not reach Anthropic's API");
  }
  if (error instanceof Anthropic.APIError) {
    return new Error(
      `Anthropic responded ${error.status ?? ""}: ${error.message}`.slice(0, 400),
    );
  }
  return error;
};

const text = (message: Anthropic.Message) =>
  message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

const checkStop = (message: Anthropic.Message) => {
  if (message.stop_reason === "refusal") {
    throw new Error(
      `The model declined this request${message.stop_details?.explanation ? `: ${message.stop_details.explanation}` : "."}`,
    );
  }
};

export async function anthropicComplete(
  config: AiConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  try {
    const message = await client(config).messages.create(
      {
        model: config.model,
        max_tokens: NON_STREAMING_MAX_TOKENS,
        ...split(messages),
      },
      { signal },
    );
    checkStop(message);
    return text(message);
  } catch (error) {
    throw failure(error, signal);
  }
}

export async function* anthropicStream(
  config: AiConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  try {
    const stream = client(config).messages.stream(
      {
        model: config.model,
        max_tokens: STREAMING_MAX_TOKENS,
        ...split(messages),
      },
      { signal },
    );
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
    checkStop(await stream.finalMessage());
  } catch (error) {
    throw failure(error, signal);
  }
}

/**
 * One request in which Claude searches the web itself (Anthropic's server-side
 * web search tool) and answers from what it found. Returns the answer and
 * every page the searches returned, so cited links can be checked against it.
 */
export async function anthropicWebResearch(
  config: AiConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<{ text: string; sources: WebSource[] }> {
  const { system, messages: initial } = split(messages);
  const anthropic = client(config);
  const sources = new Map<string, WebSource>();
  const answer: string[] = [];

  const run = async (
    tool: Anthropic.WebSearchTool20260209 | Anthropic.WebSearchTool20250305,
  ) => {
    let conversation = initial;
    for (let turn = 0; turn <= MAX_CONTINUATIONS; turn++) {
      const message = await anthropic.messages.create(
        {
          model: config.model,
          max_tokens: NON_STREAMING_MAX_TOKENS,
          system,
          messages: conversation,
          tools: [tool],
        },
        { signal },
      );
      checkStop(message);
      for (const block of message.content) {
        if (block.type === "text") {
          answer.push(block.text);
          for (const citation of block.citations ?? []) {
            if (citation.type === "web_search_result_location") {
              sources.set(citation.url, {
                url: citation.url,
                title: citation.title ?? citation.url,
              });
            }
          }
        } else if (
          block.type === "web_search_tool_result" &&
          // an error is a single object, results are a list
          Array.isArray(block.content)
        ) {
          for (const result of block.content) {
            if (!sources.has(result.url)) {
              sources.set(result.url, { url: result.url, title: result.title });
            }
          }
        }
      }
      // the server-side search loop paused: send the turn back to resume it
      if (message.stop_reason !== "pause_turn") return;
      conversation = [
        ...conversation,
        { role: "assistant", content: message.content },
      ];
    }
  };

  try {
    try {
      await run({
        type: "web_search_20260209",
        name: "web_search",
        max_uses: WEB_SEARCH_MAX_USES,
      });
    } catch (error) {
      // models older than Opus 4.6 / Sonnet 4.6 only know the basic tool
      if (!(error instanceof Anthropic.BadRequestError) || signal?.aborted) {
        throw error;
      }
      answer.length = 0;
      await run({
        type: "web_search_20250305",
        name: "web_search",
        max_uses: WEB_SEARCH_MAX_USES,
      });
    }
    return { text: answer.join(""), sources: [...sources.values()] };
  } catch (error) {
    throw failure(error, signal);
  }
}

/** Model ids the key can use, for the "fetch models" button in settings. */
export async function anthropicModels(config: Omit<AiConfig, "model">) {
  try {
    const ids: string[] = [];
    for await (const model of client({ ...config, model: "" }).models.list()) {
      ids.push(model.id);
      if (ids.length >= 200) break;
    }
    return ids;
  } catch (error) {
    throw failure(error);
  }
}
