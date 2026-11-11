/**
 * Connection to an OpenAI-compatible chat API (OpenAI, Ollama, LM Studio,
 * vLLM, OpenRouter, LiteLLM, ...). Configured entirely through environment
 * variables so the key never reaches the browser or the database:
 *
 *   AI_BASE_URL  e.g. https://api.openai.com/v1  or  http://localhost:11434/v1
 *   AI_MODEL     model name as the server knows it
 *   AI_API_KEY   optional for local servers
 */
export type AiConfig = { baseUrl: string; model: string; apiKey?: string };

export const getAiConfig = (): AiConfig | null => {
  const baseUrl = process.env.AI_BASE_URL?.trim().replace(/\/+$/, "");
  const model = process.env.AI_MODEL?.trim();
  if (!baseUrl || !model) return null;
  return { baseUrl, model, apiKey: process.env.AI_API_KEY?.trim() || undefined };
};

export const AI_NOT_CONFIGURED =
  "AI is not configured. Set AI_BASE_URL and AI_MODEL (and AI_API_KEY if your provider needs one) in the server environment.";
