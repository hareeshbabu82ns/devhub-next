/**
 * What the speech server offers (models, voices, styles, languages) in one
 * shape, whatever shape the server answered in — and the mapping between its
 * 2-letter language codes and the app's script codes.
 *
 * Pure and shared by server and client.
 */

export type SpeechModel = {
  id: string;
  description?: string;
  capabilities: string[];
  /** What the model does, when the server says so. */
  modality?: "tts" | "asr";
  /** The server's default for its modality. */
  isDefault?: boolean;
  /** loaded, cached (downloaded) or registered (not downloaded yet). */
  status?: string;
  /** Set on an OpenAI name (tts-1, whisper-1): the model it stands for. */
  aliasOf?: string;
};

export type SpeechVoice = {
  name: string;
  gender?: string;
  /** 2-letter code, e.g. "te". */
  lang?: string;
  langName?: string;
  desc?: string;
};

export type SpeechVoiceCatalog = {
  voices: SpeechVoice[];
  /** OpenAI voice name -> the voice it stands for, e.g. alloy -> Amit. */
  aliases: Record<string, string>;
  styles: string[];
};

/** The default model's voices, and each model's own where they differ. */
export type SpeechVoicesByModel = SpeechVoiceCatalog & {
  byModel: Record<string, SpeechVoiceCatalog>;
};

export type SpeechLanguage = { code: string; name: string };

export type SpeechLanguageCatalog = {
  languages: SpeechLanguage[];
  /** Transcription output modes: native, mixed, romanised. */
  modes: string[];
};

/** Each transcribing model's languages and modes, and the default's. */
export type SpeechLanguagesByModel = SpeechLanguageCatalog & {
  byModel: Record<string, SpeechLanguageCatalog>;
};

/** What the transcription server can do, for the microphone settings. */
export type TranscribeOptions = SpeechLanguagesByModel & {
  models: SpeechModel[];
  /** "" when the server does not say. */
  defaultModel: string;
  /** False when the server did not answer; the lists are then empty. */
  live: boolean;
};

export type SpeechOptions = SpeechVoicesByModel &
  SpeechLanguageCatalog & {
    models: SpeechModel[];
    defaultModel: string;
    /** False when the server could not be reached and these are defaults. */
    live: boolean;
    /** Why the live lists are missing. */
    error?: string;
  };

export const DEFAULT_SPEECH_MODEL = "indic-speak-mlx";

export const FALLBACK_SPEECH_MODELS: SpeechModel[] = [
  "indic-speak-mlx",
  "indic-speak-torch",
  "tts-1",
  "tts-1-hd",
].map((id) => ({ id, capabilities: ["text-to-speech"] }));

export const FALLBACK_SPEECH_ALIASES: Record<string, string> = {
  alloy: "Amit",
  shimmer: "Sravani",
  echo: "Arun",
  fable: "Deepika",
  onyx: "Vamsi",
  nova: "Kavya",
};

export const FALLBACK_SPEECH_STYLES = [
  "NEUTRAL",
  "HAPPY",
  "SAD",
  "ANGER",
  "FEAR",
  "SURPRISE",
  "DISGUST",
  "news",
  "AIR style news",
  "TV style news",
  "advertisements",
  "children's stories",
  "educational lecture",
  "Customer Care",
  "single person narration audiobook",
];

export const FALLBACK_SPEECH_LANGUAGES: SpeechLanguage[] = [
  { code: "te", name: "Telugu" },
  { code: "sa", name: "Sanskrit" },
  { code: "hi", name: "Hindi" },
  { code: "ta", name: "Tamil" },
  { code: "kn", name: "Kannada" },
  { code: "en", name: "English" },
];

export const FALLBACK_SPEECH_MODES = ["native", "mixed", "romanised"];

export const SPEECH_SPEEDS = [0.75, 0.9, 1, 1.1, 1.25];
export const DEFAULT_SPEECH_STYLE = "NEUTRAL";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

const firstStr = (o: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = str(o[key]);
    if (value) return value;
  }
  return undefined;
};

/** A list out of an array or a `{ name: item }` map; map keys become names. */
const entries = (value: unknown): [string | undefined, unknown][] => {
  if (Array.isArray(value)) return value.map((item) => [undefined, item]);
  if (isRecord(value)) return Object.entries(value);
  return [];
};

const stringList = (value: unknown): string[] => {
  const seen = new Set<string>();
  for (const [key, item] of entries(value)) {
    const name =
      str(item) ??
      (isRecord(item) ? firstStr(item, "id", "name", "value") : undefined) ??
      key;
    if (name) seen.add(name);
  }
  return [...seen];
};

const ASR_PATTERN = /^(asr|stt)$|speech-to-text|transcri|recogni/i;
const TTS_PATTERN = /^tts$|text-to-speech|speech-synth/i;

/** `GET /v1/models`: `{ data: [...] }`, `{ models: ... }`, a list or a map. */
export function normalizeSpeechModels(payload: unknown): SpeechModel[] {
  const source = isRecord(payload)
    ? (payload.data ?? payload.models ?? payload)
    : payload;
  const models = new Map<string, SpeechModel>();
  for (const [key, item] of entries(source)) {
    const record = isRecord(item) ? item : {};
    const id = str(item) ?? firstStr(record, "id", "name", "model") ?? key;
    if (!id || models.has(id)) continue;
    const capabilities = stringList(record.capabilities);
    const said = firstStr(record, "modality", "type", "task")?.toLowerCase();
    const modality = [said, ...capabilities].some(
      (c) => !!c && ASR_PATTERN.test(c),
    )
      ? "asr"
      : [said, ...capabilities].some((c) => !!c && TTS_PATTERN.test(c))
        ? "tts"
        : undefined;
    models.set(id, {
      id,
      description: firstStr(record, "description", "desc"),
      capabilities,
      ...(modality ? { modality } : {}),
      ...(record.is_default === true ? { isDefault: true } : {}),
      ...(str(record.status) ? { status: str(record.status) } : {}),
      ...(str(record.alias_of) ? { aliasOf: str(record.alias_of) } : {}),
    });
  }
  return [...models.values()];
}

/** Models that speak. A server that says nothing about them offers all. */
export const ttsModels = (models: SpeechModel[]) => {
  const speaking = models.filter((m) => m.modality === "tts");
  return speaking.length > 0
    ? speaking
    : models.filter((m) => m.modality !== "asr");
};

/** Models that transcribe, as far as the server says. */
export const asrModels = (models: SpeechModel[]) =>
  models.filter((m) => m.modality === "asr");

/** The model that transcribes: the server's default, else the first. */
export const asrModel = (models: SpeechModel[]) => {
  const listening = asrModels(models);
  return (listening.find((m) => m.isDefault) ?? listening[0])?.id;
};

/** "whisper-large-v3 (not downloaded)", "tts-1 (OpenAI alias → …)" */
export const speechModelLabel = (model: SpeechModel) =>
  model.aliasOf
    ? `${model.id} (OpenAI alias → ${model.aliasOf})`
    : model.status === "registered"
      ? `${model.id} (not downloaded)`
      : model.id;

/** Gives each alias the per-model entry of the model it stands for. */
export const withAliasEntries = <T,>(
  byModel: Record<string, T>,
  models: SpeechModel[],
): Record<string, T> => {
  const all = { ...byModel };
  for (const model of models) {
    if (model.aliasOf && !all[model.id] && all[model.aliasOf]) {
      all[model.id] = all[model.aliasOf];
    }
  }
  return all;
};

/**
 * `GET /v1/audio/voices`: voices as a map or a list, aliases and styles —
 * and the same per model under `models`, when models differ in voices.
 */
export function normalizeSpeechVoices(payload: unknown): SpeechVoicesByModel {
  const byModel: Record<string, SpeechVoiceCatalog> = {};
  if (isRecord(payload) && isRecord(payload.models)) {
    for (const [model, catalog] of Object.entries(payload.models)) {
      if (isRecord(catalog)) byModel[model] = voiceCatalog(catalog);
    }
  }
  return { ...voiceCatalog(payload), byModel };
}

function voiceCatalog(payload: unknown): SpeechVoiceCatalog {
  const root = isRecord(payload) ? payload : {};
  const source = isRecord(payload) ? (payload.voices ?? payload.data) : payload;

  const voices = new Map<string, SpeechVoice>();
  for (const [key, item] of entries(source)) {
    const record = isRecord(item) ? item : {};
    const name =
      str(item) ?? firstStr(record, "name", "id", "voice", "voice_id") ?? key;
    if (!name || voices.has(name)) continue;
    voices.set(name, {
      name,
      gender: firstStr(record, "gender"),
      lang: firstStr(record, "lang", "language", "language_code")?.toLowerCase(),
      langName: firstStr(record, "lang_name", "language_name"),
      desc: firstStr(record, "desc", "description"),
    });
  }

  const aliases: Record<string, string> = {};
  for (const [key, item] of entries(root.openai_aliases ?? root.aliases)) {
    const record = isRecord(item) ? item : {};
    const alias = key ?? firstStr(record, "alias", "name", "id");
    const target = str(item) ?? firstStr(record, "voice", "target", "maps_to");
    if (alias && target) aliases[alias] = target;
  }

  return {
    voices: [...voices.values()],
    aliases,
    styles: stringList(root.styles),
  };
}

/**
 * `GET /v1/audio/languages`: `{ code: name }`, or a list of either — and
 * the same per transcribing model under `models`.
 */
export function normalizeSpeechLanguages(
  payload: unknown,
): SpeechLanguagesByModel {
  const byModel: Record<string, SpeechLanguageCatalog> = {};
  if (isRecord(payload) && isRecord(payload.models)) {
    for (const [model, catalog] of Object.entries(payload.models)) {
      if (isRecord(catalog)) byModel[model] = languageCatalog(catalog);
    }
  }
  return { ...languageCatalog(payload), byModel };
}

function languageCatalog(payload: unknown): SpeechLanguageCatalog {
  const root = isRecord(payload) ? payload : {};
  const source = isRecord(payload) ? (payload.languages ?? payload.data) : payload;

  const languages = new Map<string, SpeechLanguage>();
  for (const [key, item] of entries(source)) {
    const record = isRecord(item) ? item : {};
    const code = (
      key ??
      firstStr(record, "code", "id", "lang") ??
      str(item)
    )?.toLowerCase();
    if (!code || languages.has(code)) continue;
    const name =
      (key ? str(item) : undefined) ??
      firstStr(record, "name", "lang_name", "label") ??
      code;
    languages.set(code, { code, name });
  }

  return { languages: [...languages.values()], modes: stringList(root.modes) };
}

/* ---------- language codes ---------- */

/** App script code -> the speech server's language code. */
const APP_TO_SPEECH_LANG: Record<string, string> = {
  TEL: "te",
  SAN: "sa",
  HIN: "hi",
  ENG: "en",
  TAM: "ta",
  KAN: "kn",
  MAL: "ml",
  BEN: "bn",
  GUJ: "gu",
  MAR: "mr",
  PAN: "pa",
  ORI: "or",
  URD: "ur",
  ASM: "as",
  NEP: "ne",
  // romanised Sanskrit
  IAST: "sa",
  ITRANS: "sa",
  SLP1: "sa",
};

export const speechLangForApp = (appLang?: string | null) =>
  appLang ? APP_TO_SPEECH_LANG[appLang.toUpperCase()] : undefined;

/**
 * App script codes holding text in a speech language, best first: the native
 * script, then romanisations (Sanskrit: SAN, IAST, ITRANS, SLP1).
 */
export const appLangsForSpeech = (speechLang?: string | null): string[] => {
  const code = speechLang?.toLowerCase();
  return code
    ? Object.keys(APP_TO_SPEECH_LANG).filter(
        (app) => APP_TO_SPEECH_LANG[app] === code,
      )
    : [];
};

export const appLangForSpeech = (speechLang?: string | null) =>
  appLangsForSpeech(speechLang)[0];

export type LanguageText = { language: string; value: string };

const usable = (value?: string | null) =>
  !!value?.trim() && !value.startsWith("$transliterateFrom");

/** Markdown marks would be read aloud or trip the voice up. */
export const toVerseSpeechText = (text: string) =>
  text
    .split("\n")
    .map((line) => line.replace(/[#*_>`~|]/g, "").replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

/** The verse's text in a speech language, ready to edit; "" when it has none. */
export function verseTextForSpeech(
  texts: LanguageText[] | null | undefined,
  speechLang: string,
): string {
  for (const app of appLangsForSpeech(speechLang)) {
    const found = texts?.find((t) => t.language === app && usable(t.value));
    if (found) return toVerseSpeechText(found.value);
  }
  return "";
}

/** Speech languages the verse has text in. */
export const speechLangsOnVerse = (texts: LanguageText[] | null | undefined) =>
  new Set(
    (texts ?? [])
      .filter((t) => usable(t.value))
      .map((t) => speechLangForApp(t.language))
      .filter((code): code is string => !!code),
  );

/**
 * The language to start with: the one being read if the verse has it and
 * the server speaks it, else the first spoken language the verse has.
 */
export function pickSpeechLanguage(
  languages: SpeechLanguage[],
  texts: LanguageText[] | null | undefined,
  appLang?: string,
): string {
  const spoken = languages.map((l) => l.code).filter((c) => c !== "auto");
  const onVerse = speechLangsOnVerse(texts);
  const reading = speechLangForApp(appLang);
  if (reading && onVerse.has(reading) && spoken.includes(reading)) {
    return reading;
  }
  return (
    spoken.find((code) => onVerse.has(code)) ??
    (reading && spoken.includes(reading) ? reading : undefined) ??
    spoken[0] ??
    "te"
  );
}

/* ---------- voices and styles ---------- */

/** "Sravani (Female · Telugu) — Bright register, vivid and engaging" */
export const speechVoiceLabel = (voice: SpeechVoice) => {
  const facts = [voice.gender, voice.langName ?? voice.lang].filter(Boolean);
  return [
    facts.length ? `${voice.name} (${facts.join(" · ")})` : voice.name,
    voice.desc,
  ]
    .filter(Boolean)
    .join(" — ");
};

/** "alloy (OpenAI alias → Amit)" */
export const speechAliasLabel = (alias: string, target: string) =>
  `${alias} (OpenAI alias → ${target})`;

/** A voice's language may carry a region: "en-us" speaks "en". */
const speaksLang = (voice: SpeechVoice, speechLang: string) =>
  voice.lang?.split(/[-_]/)[0] === speechLang.toLowerCase();

/** Voices, aliases and styles of a model (they differ between models). */
export const voiceCatalogFor = (
  options: SpeechVoicesByModel,
  model?: string,
): SpeechVoiceCatalog => (model && options.byModel[model]) || options;

/** Voices of the chosen language first, the rest in the server's order. */
export const sortVoicesForLanguage = (
  voices: SpeechVoice[],
  speechLang?: string,
) => {
  if (!speechLang) return voices;
  return [
    ...voices.filter((v) => speaksLang(v, speechLang)),
    ...voices.filter((v) => !speaksLang(v, speechLang)),
  ];
};

/**
 * The voice to select for a language: the remembered one when it speaks that
 * language, else the first that does, else whatever is on offer.
 */
export function pickVoiceForLanguage(
  catalog: Pick<SpeechVoiceCatalog, "voices" | "aliases">,
  speechLang: string,
  remembered?: string,
): string {
  const { voices, aliases } = catalog;
  const speaks = (name?: string) =>
    !!name &&
    voices.some(
      (v) => v.name === (aliases[name] ?? name) && speaksLang(v, speechLang),
    );
  if (speaks(remembered)) return remembered!;
  return (
    voices.find((v) => speaksLang(v, speechLang))?.name ??
    (remembered && (aliases[remembered] || voices.some((v) => v.name === remembered))
      ? remembered
      : undefined) ??
    voices[0]?.name ??
    Object.keys(aliases)[0] ??
    ""
  );
}

const STYLE_LABELS: Record<string, string> = {
  advertisements: "Advertisement",
  "single person narration audiobook": "Audiobook narration",
};

/** "NEUTRAL" -> "Neutral", "children's stories" -> "Children's stories". */
export const speechStyleLabel = (style: string) => {
  if (STYLE_LABELS[style]) return STYLE_LABELS[style];
  const text = /^[A-Z_]+$/.test(style)
    ? style.toLowerCase().replace(/_/g, " ")
    : style;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const speechSpeedLabel = (speed: number) =>
  `${speed.toFixed(2).replace(/0$/, "")}x${speed === 1 ? " (normal)" : ""}`;
