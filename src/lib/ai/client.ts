import { AiConfig } from "./config";

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
): Promise<string> {
  const response = await post(config, { messages, stream: false }, signal);
  const json = await response.json();
  return json?.choices?.[0]?.message?.content ?? "";
}

/** Streaming completion; yields text as the model produces it. */
export async function* chatStream(
  config: AiConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
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
