import { quantize } from "./text";

/**
 * Embeddings come from any OpenAI-compatible `/embeddings` endpoint (OpenAI,
 * Ollama, LM Studio, vLLM...), configured like the chat model:
 *
 *   AI_EMBED_MODEL       e.g. nomic-embed-text-v2-moe (multilingual models
 *                        work best: the library is mostly Sanskrit)
 *   AI_EMBED_BASE_URL    defaults to AI_BASE_URL
 *   AI_EMBED_API_KEY     defaults to AI_API_KEY
 *   AI_EMBED_DIMENSIONS  optional: keep only the first N dimensions. Only for
 *                        models trained for it (Matryoshka), e.g. to bring a
 *                        4096-d model down to 1024.
 *   AI_EMBED_QUERY_PREFIX / AI_EMBED_DOCUMENT_PREFIX
 *                        optional: text some models expect in front of
 *                        questions and documents (nomic: "search_query: " and
 *                        "search_document: ").
 */
export type EmbedConfig = {
  baseUrl: string;
  model: string;
  apiKey?: string;
  dimensions?: number;
  queryPrefix: string;
  documentPrefix: string;
};

export const getEmbedConfig = (): EmbedConfig | null => {
  const baseUrl = (process.env.AI_EMBED_BASE_URL || process.env.AI_BASE_URL)
    ?.trim()
    .replace(/\/+$/, "");
  const model = process.env.AI_EMBED_MODEL?.trim();
  if (!baseUrl || !model) return null;
  const dimensions = Number(process.env.AI_EMBED_DIMENSIONS);
  return {
    baseUrl,
    model,
    apiKey:
      (process.env.AI_EMBED_API_KEY || process.env.AI_API_KEY)?.trim() ||
      undefined,
    dimensions:
      Number.isInteger(dimensions) && dimensions >= 32 ? dimensions : undefined,
    queryPrefix: process.env.AI_EMBED_QUERY_PREFIX ?? "",
    documentPrefix: process.env.AI_EMBED_DOCUMENT_PREFIX ?? "",
  };
};

/** Identifies the vector space; vectors with another id are not comparable. */
export const embedModelId = (config: EmbedConfig) =>
  config.dimensions ? `${config.model}@${config.dimensions}` : config.model;

export const EMBED_NOT_CONFIGURED =
  "No embedding model is configured. Set AI_EMBED_MODEL (and AI_EMBED_BASE_URL if it is not served by AI_BASE_URL) in the server environment.";

/** Embeds texts and returns quantised unit vectors, in the same order. */
export async function embedTexts(
  config: EmbedConfig,
  texts: string[],
  signal?: AbortSignal,
): Promise<Int8Array[]> {
  if (texts.length === 0) return [];
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: config.model, input: texts }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(
      `Could not reach the embedding server at ${config.baseUrl}`,
    );
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Embedding server responded ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`,
    );
  }
  const json = (await response.json()) as {
    data?: { index?: number; embedding?: number[] }[];
  };
  const rows = [...(json.data ?? [])].sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0),
  );
  if (rows.length !== texts.length || rows.some((r) => !r.embedding?.length)) {
    throw new Error(
      "Embedding server returned an unexpected number of vectors",
    );
  }
  return rows.map((r) => quantize(r.embedding!, config.dimensions));
}
