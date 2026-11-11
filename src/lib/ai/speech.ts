/**
 * Optional local speech servers. Nothing here is required: the browser's own
 * speech recognition and voices are used when these are not set.
 *
 *   AI_STT_BASE_URL  OpenAI-compatible transcription server, e.g. a local
 *                    whisper.cpp server, Speaches or LocalAI
 *                    (http://localhost:8000/v1)
 *   AI_STT_MODEL     model name as that server knows it (default "whisper-1")
 *   AI_STT_API_KEY   optional
 *
 * Reading answers aloud tries, in order:
 *   1. TTS_UTILS_URL    the library's text-to-speech server (also used to
 *                       generate verse audio)
 *   2. AI_TTS_MODEL     an OpenAI-compatible /audio/speech endpoint, such as
 *                       Ollama with a voice model ("phonon"). Served from
 *                       AI_TTS_BASE_URL, or AI_BASE_URL when that is unset.
 *      AI_TTS_VOICE     optional voice name
 *      AI_TTS_API_KEY   optional; defaults to AI_API_KEY on AI_BASE_URL
 *   3. the browser's own voices (handled in the client)
 */
export type SttConfig = { baseUrl: string; model: string; apiKey?: string };

export const getSttConfig = (): SttConfig | null => {
  const baseUrl = process.env.AI_STT_BASE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) return null;
  return {
    baseUrl,
    model: process.env.AI_STT_MODEL?.trim() || "whisper-1",
    apiKey: process.env.AI_STT_API_KEY?.trim() || undefined,
  };
};

const trimUrl = (url?: string) => url?.trim().replace(/\/+$/, "") || undefined;

const ttsBaseUrl = () => trimUrl(process.env.TTS_UTILS_URL);

export type SpeechModelConfig = {
  baseUrl: string;
  model: string;
  voice?: string;
  apiKey?: string;
};

export const getSpeechModelConfig = (): SpeechModelConfig | null => {
  const model = process.env.AI_TTS_MODEL?.trim();
  const own = trimUrl(process.env.AI_TTS_BASE_URL);
  const baseUrl = own ?? trimUrl(process.env.AI_BASE_URL);
  if (!model || !baseUrl) return null;
  return {
    baseUrl,
    model,
    voice: process.env.AI_TTS_VOICE?.trim() || undefined,
    apiKey:
      process.env.AI_TTS_API_KEY?.trim() ||
      (own ? undefined : process.env.AI_API_KEY?.trim()) ||
      undefined,
  };
};

export type SpeechSource = "library" | "model";

const speechSources = (): SpeechSource[] => [
  ...(ttsBaseUrl() ? (["library"] as const) : []),
  ...(getSpeechModelConfig() ? (["model"] as const) : []),
];

export const speechStatus = () => ({
  transcribe: !!getSttConfig(),
  speak: speechSources().length > 0,
  speakVia: speechSources(),
});

/** Sends recorded audio to the local transcription server. */
export async function transcribe(
  config: SttConfig,
  audio: Blob,
  filename: string,
  language?: string,
  signal?: AbortSignal,
): Promise<string> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", config.model);
  form.append("response_format", "json");
  if (language) form.append("language", language);
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: config.apiKey
        ? { Authorization: `Bearer ${config.apiKey}` }
        : undefined,
      body: form,
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(`Could not reach the speech server at ${config.baseUrl}`);
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Speech server responded ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`,
    );
  }
  const json = await response.json().catch(() => null);
  return typeof json?.text === "string" ? json.text.trim() : "";
}

/** Speaks text with the library's TTS server; returns WAV audio. */
export async function synthesizeLibrary(
  text: string,
  voiceKey: string,
  signal?: AbortSignal,
): Promise<Buffer> {
  const baseUrl = ttsBaseUrl();
  if (!baseUrl) throw new Error("No text-to-speech server is configured");
  const clean = text
    .replace(/\s+/g, " ")
    .replace(/[।]/g, " , ")
    .replace(/[॥]/g, " . ")
    .trim();
  if (!clean) throw new Error("Nothing to read");
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: clean,
        reference_voice_key: voiceKey,
        save_to_file: false,
      }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("Could not reach the text-to-speech server");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `TTS server responded ${response.status}`);
  }
  const data = await response.json();
  if (!data?.audio_base64) throw new Error("TTS server returned no audio");
  return Buffer.from(data.audio_base64, "base64");
}

/**
 * Speaks text with an OpenAI-compatible /audio/speech endpoint (Ollama,
 * Speaches, Kokoro...). The audio streams as it is generated.
 */
export async function synthesizeModel(
  config: SpeechModelConfig,
  text: string,
  signal?: AbortSignal,
): Promise<{ body: ReadableStream<Uint8Array>; contentType: string }> {
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        input: text,
        ...(config.voice ? { voice: config.voice } : {}),
      }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(`Could not reach the speech model at ${config.baseUrl}`);
  }
  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Speech model responded ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`,
    );
  }
  return {
    body: response.body,
    contentType: response.headers.get("content-type") || "audio/mpeg",
  };
}

// a source that just failed is skipped for a while, so every sentence of an
// answer does not wait on a server that is down
const RETRY_AFTER_MS = 60 * 1000;
const failedAt = new Map<SpeechSource, number>();

/**
 * Speaks text with the first local source that works: the library's TTS
 * server, then the speech model. Throws when none is configured or working,
 * and the client falls back to the browser's voices.
 */
export async function synthesizeSpeech(
  text: string,
  voiceKey: string,
  signal?: AbortSignal,
): Promise<{
  body: ReadableStream<Uint8Array> | Uint8Array;
  contentType: string;
  source: SpeechSource;
}> {
  const sources = speechSources();
  if (sources.length === 0) {
    throw new Error("No text-to-speech server is configured");
  }
  const now = Date.now();
  const fresh = sources.filter(
    (s) => now - (failedAt.get(s) ?? 0) > RETRY_AFTER_MS,
  );
  // when every source failed recently, try them all again anyway
  const order = fresh.length > 0 ? fresh : sources;
  let lastError: unknown;
  for (const source of order) {
    try {
      if (source === "library") {
        const audio = await synthesizeLibrary(text, voiceKey, signal);
        failedAt.delete(source);
        return {
          body: new Uint8Array(audio),
          contentType: "audio/wav",
          source,
        };
      }
      const result = await synthesizeModel(
        getSpeechModelConfig()!,
        text,
        signal,
      );
      failedAt.delete(source);
      return { ...result, source };
    } catch (error) {
      if (signal?.aborted) throw error;
      console.warn(`Speech source "${source}" failed:`, error);
      failedAt.set(source, Date.now());
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Speech failed");
}
