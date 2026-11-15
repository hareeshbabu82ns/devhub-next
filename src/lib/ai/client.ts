import { AiConfig } from "./config";
import { anthropicComplete, anthropicStream } from "./anthropic";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const headers = (config: AiConfig) => ({
  "Content-Type": "application/json",
  ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
});

const failure = async (response: Response) => {
  const body = await response.text().catch(() => "");
  return new Error(
    `AI server responded ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`,
  );
};

const post = async (config: AiConfig, body: object, signal?: AbortSignal) => {
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: headers(config),
      body: JSON.stringify({ model: config.model, ...body }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(`Could not reach the AI server at ${config.baseUrl}`);
  }
  if (!response.ok) throw await failure(response);
  return response;
};

/** One-shot completion; returns the assistant's text. */
export async function chatComplete(
  config: AiConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
  /**
   * extra request fields for OpenAI-compatible servers, e.g.
   * `{ temperature: 0.1 }`; Claude takes none of them
   */
  options: Record<string, unknown> = {},
): Promise<string> {
  if (config.kind === "anthropic") {
    return anthropicComplete(config, messages, signal);
  }
  const response = await post(
    config,
    { messages, stream: false, ...options },
    signal,
  );
  const json = await response.json();
  return json?.choices?.[0]?.message?.content ?? "";
}

/** Streaming completion; yields text as the model produces it. */
export async function* chatStream(
  config: AiConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  if (config.kind === "anthropic") {
    yield* anthropicStream(config, messages, signal);
    return;
  }
  const response = await post(config, { messages, stream: true }, signal);
  if (!response.body) throw new Error("AI server returned no content");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // server-sent events: one `data: {...}` line per chunk
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const data = line.trim();
      if (!data.startsWith("data:")) continue;
      const payload = data.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const text = JSON.parse(payload)?.choices?.[0]?.delta?.content;
        if (text) yield text as string;
      } catch {
        // a keep-alive or partial line; the next chunk completes it
      }
    }
  }
}

/** Model names an OpenAI-compatible server offers (`GET /models`). */
export async function listModels(
  config: Pick<AiConfig, "baseUrl" | "apiKey">,
): Promise<string[]> {
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/models`, {
      headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(`Could not reach the AI server at ${config.baseUrl}`);
  }
  if (!response.ok) throw await failure(response);
  const json = await response.json().catch(() => null);
  const list: unknown[] = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json?.models)
      ? json.models
      : [];
  return list
    .map((m) =>
      typeof m === "string"
        ? m
        : String((m as { id?: unknown; name?: unknown })?.id ?? (m as { name?: unknown })?.name ?? ""),
    )
    .map((id) => id.replace(/^models\//, ""))
    .filter(Boolean)
    .sort();
}
