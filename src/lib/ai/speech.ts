import {
  asrModel,
  DEFAULT_SPEECH_MODEL,
  FALLBACK_SPEECH_ALIASES,
  FALLBACK_SPEECH_LANGUAGES,
  FALLBACK_SPEECH_MODELS,
  FALLBACK_SPEECH_MODES,
  FALLBACK_SPEECH_STYLES,
  normalizeSpeechLanguages,
  normalizeSpeechModels,
  normalizeSpeechVoices,
  asrModels,
  SpeechLanguagesByModel,
  SpeechModel,
  SpeechOptions,
  SpeechVoicesByModel,
  TranscribeOptions as TranscribeCatalog,
  ttsModels,
  withAliasEntries,
} from "@/lib/audio/speech-options";

/**
 * Optional local speech servers. Nothing here is required: the browser's own
 * speech recognition and voices are used when these are not set.
 *
 *   TTS_UTILS_URL    the library's speech server (Indic text-to-speech and
 *                    speech recognition, OpenAI-compatible). Given with or
 *                    without the /v1 suffix: http://localhost:8000
 *   TTS_MODEL        model for verse audio and reading aloud
 *                    (default "indic-speak-mlx")
 *   TTS_VOICE        voice when none is chosen (default "alloy")
 *
 * Voice input is transcribed by:
 *   AI_STT_BASE_URL  an OpenAI-compatible transcription server, e.g. a local
 *                    whisper.cpp server, Speaches or LocalAI
 *                    (http://localhost:8000/v1). Defaults to TTS_UTILS_URL.
 *   AI_STT_MODEL     model name as that server knows it. On the library's
 *                    server the transcribing model is looked up; otherwise
 *                    the default is "whisper-1".
 *   AI_STT_API_KEY   optional
 *
 * Reading answers aloud tries, in order:
 *   1. TTS_UTILS_URL    the library's speech server (also used to generate
 *                       verse audio)
 *   2. AI_TTS_MODEL     an OpenAI-compatible /audio/speech endpoint, such as
 *                       Ollama with a voice model ("phonon"). Served from
 *                       AI_TTS_BASE_URL, or AI_BASE_URL when that is unset.
 *      AI_TTS_VOICE     optional voice name
 *      AI_TTS_API_KEY   optional; defaults to AI_API_KEY on AI_BASE_URL
 *   3. the browser's own voices (handled in the client)
 */
export type SttConfig = {
  /** Includes the /v1 suffix. */
  baseUrl: string;
  /** Unset on the library's server until it is looked up. */
  model?: string;
  apiKey?: string;
};

const trimUrl = (url?: string) => url?.trim().replace(/\/+$/, "") || undefined;

/**
 * URL of a speech server endpoint. The configured base may be the server
 * root, end in /v1, or still carry the /api suffix of the server it replaced.
 */
export const resolveSpeechUrl = (base: string, path: string) => {
  const root = (trimUrl(base) ?? "").replace(/\/(v1|api)$/i, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return suffix === "/health" ? `${root}/health` : `${root}/v1${suffix}`;
};

const ttsBaseUrl = () => trimUrl(process.env.TTS_UTILS_URL);

export const defaultSpeechModel = () =>
  process.env.TTS_MODEL?.trim() || DEFAULT_SPEECH_MODEL;

const defaultSpeechVoice = () => process.env.TTS_VOICE?.trim() || "alloy";

export const getSttConfig = (): SttConfig | null => {
  const own = trimUrl(process.env.AI_STT_BASE_URL);
  const library = ttsBaseUrl();
  if (!own && !library) return null;
  const model = process.env.AI_STT_MODEL?.trim();
  return {
    baseUrl: own ?? resolveSpeechUrl(library!, "").replace(/\/$/, ""),
    model: model || (own ? "whisper-1" : undefined),
    apiKey: process.env.AI_STT_API_KEY?.trim() || undefined,
  };
};

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

export type TranscribeOptions = {
  /** Overrides the configured model. */
  model?: string;
  language?: string;
  /** Output script: native, mixed or romanised (the library's server). */
  mode?: string;
  prompt?: string;
  temperature?: number;
};

// which model transcribes on the library's server, asked once per base URL
const sttModels = new Map<string, Promise<string>>();

const sttModelFor = (config: SttConfig): Promise<string> => {
  if (config.model) return Promise.resolve(config.model);
  let found = sttModels.get(config.baseUrl);
  if (!found) {
    found = getJson(`${config.baseUrl}/models`)
      .then((payload) => asrModel(normalizeSpeechModels(payload)))
      .catch(() => {
        // server not up yet: ask again next time
        sttModels.delete(config.baseUrl);
        return undefined;
      })
      .then((model) => model ?? "whisper-1");
    sttModels.set(config.baseUrl, found);
  }
  return found;
};

/** Sends recorded audio to the transcription server. */
export async function transcribe(
  config: SttConfig,
  audio: Blob,
  filename: string,
  options: TranscribeOptions = {},
  signal?: AbortSignal,
): Promise<string> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", options.model || (await sttModelFor(config)));
  form.append("response_format", "json");
  if (options.language) form.append("language", options.language);
  if (options.mode) form.append("mode", options.mode);
  if (options.prompt) form.append("prompt", options.prompt);
  if (options.temperature !== undefined) {
    form.append("temperature", String(options.temperature));
  }
  form.append("save", "false");
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

export type SpeechRequest = {
  model?: string;
  voice?: string;
  /** Delivery style / mood, e.g. "NEUTRAL". */
  style?: string;
  speed?: number;
  /** Audio container: "wav" (default) or "mp3". */
  format?: "wav" | "mp3";
};

const AUDIO_TYPES: Record<string, string> = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
};

const errorDetail = async (response: Response) => {
  const text = await response.text().catch(() => "");
  try {
    const json = JSON.parse(text);
    const detail = json?.error?.message ?? json?.error ?? json?.detail;
    if (typeof detail === "string") return detail;
    if (detail) return JSON.stringify(detail).slice(0, 300);
  } catch {
    // not JSON
  }
  return text.slice(0, 300);
};

/**
 * Speaks text with the library's speech server (`POST /v1/audio/speech`).
 * The text is sent as given. The server answers with the audio itself or
 * with JSON carrying it in base64; both are accepted.
 */
export async function synthesizeLibrary(
  text: string,
  options: SpeechRequest = {},
  signal?: AbortSignal,
): Promise<{ audio: Buffer; contentType: string }> {
  const baseUrl = ttsBaseUrl();
  if (!baseUrl) throw new Error("No text-to-speech server is configured");
  const input = text.trim();
  if (!input) throw new Error("Nothing to read");
  const format = options.format ?? "wav";
  let response: Response;
  try {
    response = await fetch(resolveSpeechUrl(baseUrl, "/audio/speech"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model || defaultSpeechModel(),
        input,
        voice: options.voice || defaultSpeechVoice(),
        response_format: format,
        speed: options.speed ?? 1,
        ...(options.style ? { style: options.style } : {}),
        stream: false,
        save: false,
      }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error("Could not reach the text-to-speech server");
  }
  if (!response.ok) {
    const detail = await errorDetail(response);
    throw new Error(
      `TTS server responded ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const data = await response.json().catch(() => null);
    const base64 =
      data?.audio_base64 ?? data?.audio ?? data?.b64_json ?? data?.data;
    if (typeof base64 !== "string" || !base64) {
      throw new Error("TTS server returned no audio");
    }
    const answered = String(data?.format ?? data?.response_format ?? format);
    return {
      audio: Buffer.from(base64.replace(/^data:[^,]*,/, ""), "base64"),
      contentType: AUDIO_TYPES[answered] ?? AUDIO_TYPES[format],
    };
  }
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length === 0) throw new Error("TTS server returned no audio");
  return {
    audio,
    contentType: type.startsWith("audio/") ? type : AUDIO_TYPES[format],
  };
}

/* ---------- what the library's speech server offers ---------- */

const CATALOG_TIMEOUT_MS = 5000;

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.json();
}

const libraryJson = (path: string) => {
  const baseUrl = ttsBaseUrl();
  if (!baseUrl) throw new Error("No text-to-speech server is configured");
  return getJson(resolveSpeechUrl(baseUrl, path));
};

export const listSpeechModels = async (): Promise<SpeechModel[]> =>
  normalizeSpeechModels(await libraryJson("/models"));

export const listSpeechVoices = async (): Promise<SpeechVoicesByModel> =>
  normalizeSpeechVoices(await libraryJson("/audio/voices"));

export const listSpeechLanguages = async (): Promise<SpeechLanguagesByModel> =>
  normalizeSpeechLanguages(await libraryJson("/audio/languages"));

export const checkSpeechHealth = async (): Promise<boolean> => {
  const baseUrl = ttsBaseUrl();
  if (!baseUrl) return false;
  try {
    const response = await fetch(resolveSpeechUrl(baseUrl, "/health"), {
      signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Models, voices, styles and languages for the audio dialog. Whatever the
 * server does not answer falls back to the documented defaults, so audio can
 * still be requested while a list is missing.
 */
export async function loadSpeechOptions(): Promise<SpeechOptions> {
  const [models, voices, languages] = await Promise.allSettled([
    listSpeechModels(),
    listSpeechVoices(),
    listSpeechLanguages(),
  ]);
  const ok = <T,>(r: PromiseSettledResult<T>) =>
    r.status === "fulfilled" ? r.value : undefined;
  const failed = [models, voices, languages].find(
    (r) => r.status === "rejected",
  ) as PromiseRejectedResult | undefined;

  const speaking = ttsModels(ok(models) ?? []);
  const modelList = speaking.length > 0 ? speaking : FALLBACK_SPEECH_MODELS;
  const preferred =
    process.env.TTS_MODEL?.trim() ||
    modelList.find((m) => m.isDefault)?.id ||
    defaultSpeechModel();
  const voiceCatalog = ok(voices);
  const languageCatalog = ok(languages);
  const aliases = voiceCatalog?.aliases ?? {};
  return {
    models: modelList,
    defaultModel: modelList.some((m) => m.id === preferred)
      ? preferred
      : modelList[0].id,
    voices: voiceCatalog?.voices ?? [],
    byModel: withAliasEntries(voiceCatalog?.byModel ?? {}, modelList),
    aliases:
      voiceCatalog && (voiceCatalog.voices.length || Object.keys(aliases).length)
        ? aliases
        : FALLBACK_SPEECH_ALIASES,
    styles: voiceCatalog?.styles.length
      ? voiceCatalog.styles
      : FALLBACK_SPEECH_STYLES,
    languages: languageCatalog?.languages.length
      ? languageCatalog.languages
      : FALLBACK_SPEECH_LANGUAGES,
    modes: languageCatalog?.modes.length
      ? languageCatalog.modes
      : FALLBACK_SPEECH_MODES,
    live: !failed,
    error: failed
      ? failed.reason instanceof Error
        ? failed.reason.message
        : "The speech server did not answer"
      : undefined,
  };
}

/**
 * Models, languages and output modes of the transcription server, for the
 * microphone settings. A server that does not list them (plain Whisper
 * servers) gives empty lists, and its configured model is used.
 */
export async function loadTranscribeOptions(): Promise<TranscribeCatalog> {
  const empty: TranscribeCatalog = {
    models: [],
    defaultModel: "",
    languages: [],
    modes: [],
    byModel: {},
    live: false,
  };
  const config = getSttConfig();
  if (!config) return empty;
  const [models, languages] = await Promise.allSettled([
    getJson(`${config.baseUrl}/models`).then(normalizeSpeechModels),
    getJson(`${config.baseUrl}/audio/languages`).then(normalizeSpeechLanguages),
  ]);
  const listening =
    models.status === "fulfilled" ? asrModels(models.value) : [];
  const catalog = languages.status === "fulfilled" ? languages.value : null;
  return {
    models: listening,
    defaultModel:
      (config.model && listening.some((m) => m.id === config.model)
        ? config.model
        : asrModel(listening)) ?? "",
    languages: catalog?.languages ?? [],
    modes: catalog?.modes ?? [],
    byModel: withAliasEntries(catalog?.byModel ?? {}, listening),
    live: models.status === "fulfilled" || languages.status === "fulfilled",
  };
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
  /** Voice and model on the library's speech server; unset uses its defaults. */
  library: Pick<SpeechRequest, "voice" | "model"> = {},
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
        const { audio, contentType } = await synthesizeLibrary(
          text.replace(/\s+/g, " "),
          { voice: library.voice, model: library.model },
          signal,
        );
        failedAt.delete(source);
        return { body: new Uint8Array(audio), contentType, source };
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
