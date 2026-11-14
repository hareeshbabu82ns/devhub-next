/**
 * @jest-environment node
 */
import {
  checkSpeechHealth,
  getSttConfig,
  loadSpeechOptions,
  loadTranscribeOptions,
  resolveSpeechUrl,
  speechStatus,
  synthesizeLibrary,
  synthesizeSpeech,
  transcribe,
} from "../ai/speech";
import {
  appLangForSpeech,
  appLangsForSpeech,
  asrModel,
  asrModels,
  normalizeSpeechLanguages,
  normalizeSpeechModels,
  normalizeSpeechVoices,
  pickSpeechLanguage,
  pickVoiceForLanguage,
  sortVoicesForLanguage,
  speechAliasLabel,
  speechLangForApp,
  speechLangsOnVerse,
  speechModelLabel,
  speechSpeedLabel,
  speechStyleLabel,
  speechVoiceLabel,
  ttsModels,
  verseTextForSpeech,
  voiceCatalogFor,
} from "../audio/speech-options";

const ENV_KEYS = [
  "TTS_UTILS_URL",
  "TTS_MODEL",
  "TTS_VOICE",
  "AI_STT_BASE_URL",
  "AI_BASE_URL",
  "AI_TTS_MODEL",
  "AI_TTS_BASE_URL",
];
const savedEnv: Record<string, string | undefined> = {};
const realFetch = global.fetch;
const fetchMock = jest.fn();

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  global.fetch = realFetch;
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const MODELS = {
  object: "list",
  data: [
    {
      id: "indic-speak-mlx",
      object: "model",
      capabilities: ["text-to-speech", "streaming"],
      description: "MLX text-to-speech",
    },
    { id: "indic-listen", capabilities: ["speech-to-text"] },
  ],
};
// as the live server answers: modality, default flag and download status
const LIVE_MODELS = {
  object: "list",
  data: [
    { id: "indic-speak-mlx", modality: "tts", status: "loaded", is_default: true },
    { id: "kokoro-82m", modality: "tts", status: "cached", is_default: false },
    { id: "whisper-large-v3", modality: "asr", status: "registered", is_default: false },
    { id: "indic-transcribe", modality: "asr", status: "cached", is_default: true },
    { id: "tts-1", modality: "tts", status: "loaded", alias_of: "kokoro-82m" },
    { id: "whisper-1", modality: "asr", status: "loaded", alias_of: "whisper-large-v3" },
  ],
};
const LIVE_VOICES = {
  ...{
    voices: { Amit: { gender: "Male", lang: "hi", lang_name: "Hindi" } },
    openai_aliases: { alloy: "Amit" },
    styles: ["NEUTRAL", "HAPPY"],
  },
  models: {
    "indic-speak-mlx": {
      voices: { Amit: { gender: "Male", lang: "hi", lang_name: "Hindi" } },
      openai_aliases: { alloy: "Amit" },
      styles: ["NEUTRAL", "HAPPY"],
    },
    "kokoro-82m": {
      voices: { af_heart: { gender: "Female", lang: "en-us", desc: "" } },
      openai_aliases: { alloy: "af_alloy" },
      styles: [],
    },
  },
};
const LIVE_LANGUAGES = {
  model: "indic-transcribe",
  languages: { auto: "Auto-detect", te: "Telugu" },
  modes: ["native", "mixed", "romanised"],
  models: {
    "indic-transcribe": {
      languages: { auto: "Auto-detect", te: "Telugu" },
      modes: ["native", "mixed", "romanised"],
    },
    "whisper-large-v3": {
      languages: { auto: "Auto-detect", fr: "French", te: "Telugu" },
      modes: ["native"],
    },
  },
};
const VOICES = {
  voices: {
    Amit: { gender: "Male", lang: "hi", lang_name: "Hindi", desc: "Warm" },
    Sravani: {
      gender: "Female",
      lang: "te",
      lang_name: "Telugu",
      desc: "Bright register, vivid and engaging",
    },
  },
  openai_aliases: { alloy: "Amit", shimmer: "Sravani" },
  styles: ["NEUTRAL", "HAPPY", "children's stories"],
};
const LANGUAGES = {
  languages: { auto: "Auto-detect", hi: "Hindi", sa: "Sanskrit", te: "Telugu" },
  modes: ["native", "mixed", "romanised"],
};

describe("resolveSpeechUrl", () => {
  it.each([
    "http://host:8000",
    "http://host:8000/",
    "http://host:8000/v1",
    "http://host:8000/v1/",
    "http://host:8000/api",
  ])("builds /v1 endpoints from %s", (base) => {
    expect(resolveSpeechUrl(base, "/audio/speech")).toBe(
      "http://host:8000/v1/audio/speech",
    );
    expect(resolveSpeechUrl(base, "/health")).toBe("http://host:8000/health");
  });
});

describe("getSttConfig", () => {
  it("is null when no speech server is configured", () => {
    expect(getSttConfig()).toBeNull();
    expect(speechStatus()).toEqual({ transcribe: false, speak: false });
  });

  it("is the speech server, and nothing else", () => {
    process.env.TTS_UTILS_URL = "http://host:8000";
    // the chat model's server and the retired speech variables play no part
    process.env.AI_BASE_URL = "http://llm:11434/v1";
    process.env.AI_TTS_MODEL = "phonon";
    process.env.AI_TTS_BASE_URL = "http://llm:11434/v1";
    process.env.AI_STT_BASE_URL = "http://stt:9000/v1";
    expect(getSttConfig()).toEqual({ baseUrl: "http://host:8000/v1" });
    expect(speechStatus()).toEqual({ transcribe: true, speak: true });
  });

  it("does not speak through the chat model's server", async () => {
    process.env.AI_BASE_URL = "http://llm:11434/v1";
    process.env.AI_TTS_MODEL = "phonon";
    expect(speechStatus().speak).toBe(false);
    await expect(synthesizeSpeech("hello")).rejects.toThrow(
      "No text-to-speech server is configured",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("transcribe", () => {
  it("posts the recording with language and mode", async () => {
    fetchMock.mockResolvedValueOnce(json({ text: " రామ " }));
    const text = await transcribe(
      { baseUrl: "http://host:8000/v1", model: "indic-listen" },
      new Blob(["x"]),
      "speech.webm",
      { language: "te", mode: "native" },
    );
    expect(text).toBe("రామ");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://host:8000/v1/audio/transcriptions");
    const form = init.body as FormData;
    expect(form.get("model")).toBe("indic-listen");
    expect(form.get("language")).toBe("te");
    expect(form.get("mode")).toBe("native");
    expect(form.get("response_format")).toBe("json");
    expect(form.get("file")).toBeInstanceOf(Blob);
  });

  it("looks the transcribing model up when none is configured", async () => {
    fetchMock
      .mockResolvedValueOnce(json(MODELS))
      .mockResolvedValueOnce(json({ text: "ok" }));
    await transcribe({ baseUrl: "http://lookup:8000/v1" }, new Blob(["x"]), "a.webm");
    expect(fetchMock.mock.calls[0][0]).toBe("http://lookup:8000/v1/models");
    expect((fetchMock.mock.calls[1][1].body as FormData).get("model")).toBe(
      "indic-listen",
    );
  });

  it("uses whisper-1 when the lookup fails", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce(json({ text: "ok" }));
    await transcribe({ baseUrl: "http://down:8000/v1" }, new Blob(["x"]), "a.webm");
    expect((fetchMock.mock.calls[1][1].body as FormData).get("model")).toBe(
      "whisper-1",
    );
  });
});

describe("synthesizeLibrary", () => {
  beforeEach(() => {
    process.env.TTS_UTILS_URL = "http://host:8000/api";
  });

  it("sends an OpenAI speech request and returns the audio stream", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "Content-Type": "audio/wav" },
      }),
    );
    const result = await synthesizeLibrary("  శ్రీ రామ\nజయం  ", {
      voice: "Sravani",
      style: "HAPPY",
      speed: 0.9,
    });
    expect([...result.audio]).toEqual([1, 2, 3]);
    expect(result.contentType).toBe("audio/wav");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://host:8000/v1/audio/speech");
    expect(JSON.parse(init.body)).toEqual({
      model: "indic-speak-mlx",
      // sent as written, line break included
      input: "శ్రీ రామ\nజయం",
      voice: "Sravani",
      response_format: "wav",
      speed: 0.9,
      style: "HAPPY",
      stream: false,
      save: false,
    });
  });

  it("takes model and voice defaults from the environment", async () => {
    process.env.TTS_MODEL = "indic-speak-torch";
    process.env.TTS_VOICE = "Kavya";
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array([1]), {
        headers: { "Content-Type": "audio/mpeg" },
      }),
    );
    const result = await synthesizeLibrary("hello", { format: "mp3" });
    expect(result.contentType).toBe("audio/mpeg");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      model: "indic-speak-torch",
      voice: "Kavya",
      response_format: "mp3",
      speed: 1,
    });
  });

  it("accepts audio as base64 in JSON", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ audio_base64: Buffer.from("abc").toString("base64") }),
    );
    const result = await synthesizeLibrary("hello");
    expect(result.audio.toString()).toBe("abc");
    expect(result.contentType).toBe("audio/wav");
  });

  it("reports the server's error", async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: "Unknown voice" }, 400));
    await expect(synthesizeLibrary("hello")).rejects.toThrow(
      "TTS server responded 400: Unknown voice",
    );
  });

  it("refuses empty text without calling the server", async () => {
    await expect(synthesizeLibrary("  ")).rejects.toThrow("Nothing to read");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("loadSpeechOptions", () => {
  beforeEach(() => {
    process.env.TTS_UTILS_URL = "http://host:8000";
  });

  it("reads models, voices and languages from the server", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/v1/models")) return json(MODELS);
      if (url.endsWith("/v1/audio/voices")) return json(VOICES);
      if (url.endsWith("/v1/audio/languages")) return json(LANGUAGES);
      return json({}, 404);
    });
    const options = await loadSpeechOptions();
    expect(options.live).toBe(true);
    // only the model that speaks
    expect(options.models.map((m) => m.id)).toEqual(["indic-speak-mlx"]);
    expect(options.defaultModel).toBe("indic-speak-mlx");
    expect(options.voices.map((v) => v.name)).toEqual(["Amit", "Sravani"]);
    expect(options.aliases).toEqual({ alloy: "Amit", shimmer: "Sravani" });
    expect(options.styles).toEqual(VOICES.styles);
    expect(options.languages).toContainEqual({ code: "te", name: "Telugu" });
    expect(options.modes).toEqual(["native", "mixed", "romanised"]);
  });

  it("falls back to the standard options when the server is down", async () => {
    fetchMock.mockRejectedValue(new Error("connect ECONNREFUSED"));
    const options = await loadSpeechOptions();
    expect(options.live).toBe(false);
    expect(options.error).toContain("ECONNREFUSED");
    expect(options.models.map((m) => m.id)).toEqual([
      "indic-speak-mlx",
      "indic-speak-torch",
      "tts-1",
      "tts-1-hd",
    ]);
    expect(options.aliases.alloy).toBe("Amit");
    expect(options.styles).toContain("NEUTRAL");
    expect(options.languages.map((l) => l.code)).toContain("te");
  });
});

describe("checkSpeechHealth", () => {
  it("asks /health at the server root", async () => {
    process.env.TTS_UTILS_URL = "http://host:8000/v1";
    fetchMock.mockResolvedValueOnce(new Response("ok"));
    expect(await checkSpeechHealth()).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe("http://host:8000/health");
    fetchMock.mockRejectedValueOnce(new Error("down"));
    expect(await checkSpeechHealth()).toBe(false);
  });
});

describe("normalizing server payloads", () => {
  it("reads models from a list, a map or bare names", () => {
    expect(normalizeSpeechModels(MODELS)[0]).toEqual({
      id: "indic-speak-mlx",
      description: "MLX text-to-speech",
      capabilities: ["text-to-speech", "streaming"],
      modality: "tts",
    });
    expect(normalizeSpeechModels(["tts-1", "tts-1"]).map((m) => m.id)).toEqual([
      "tts-1",
    ]);
    expect(
      normalizeSpeechModels({ models: { "tts-1": { description: "x" } } }),
    ).toEqual([{ id: "tts-1", description: "x", capabilities: [] }]);
    expect(normalizeSpeechModels(null)).toEqual([]);
  });

  it("tells speaking models from transcribing ones", () => {
    const models = normalizeSpeechModels(MODELS);
    expect(ttsModels(models).map((m) => m.id)).toEqual(["indic-speak-mlx"]);
    expect(asrModel(models)).toBe("indic-listen");
    // no capabilities listed: every model may speak
    expect(ttsModels(normalizeSpeechModels(["a", "b"]))).toHaveLength(2);
  });

  it("reads voices from a map", () => {
    const catalog = normalizeSpeechVoices(VOICES);
    expect(catalog.voices[1]).toEqual({
      name: "Sravani",
      gender: "Female",
      lang: "te",
      langName: "Telugu",
      desc: "Bright register, vivid and engaging",
    });
    expect(catalog.aliases).toEqual({ alloy: "Amit", shimmer: "Sravani" });
    expect(catalog.styles).toEqual(["NEUTRAL", "HAPPY", "children's stories"]);
  });

  it("reads voices from lists", () => {
    const catalog = normalizeSpeechVoices({
      voices: [
        { name: "Sravani", gender: "Female", language: "TE" },
        "Amit",
      ],
      aliases: [{ alias: "alloy", voice: "Amit" }],
      styles: [{ id: "NEUTRAL" }],
    });
    expect(catalog.voices).toEqual([
      { name: "Sravani", gender: "Female", lang: "te" },
      { name: "Amit" },
    ]);
    expect(catalog.aliases).toEqual({ alloy: "Amit" });
    expect(catalog.styles).toEqual(["NEUTRAL"]);
    expect(normalizeSpeechVoices(["Amit"]).voices).toEqual([{ name: "Amit" }]);
    expect(normalizeSpeechVoices(undefined)).toEqual({
      voices: [],
      aliases: {},
      styles: [],
      byModel: {},
    });
  });

  it("reads languages from a map or a list", () => {
    expect(normalizeSpeechLanguages(LANGUAGES)).toEqual({
      languages: [
        { code: "auto", name: "Auto-detect" },
        { code: "hi", name: "Hindi" },
        { code: "sa", name: "Sanskrit" },
        { code: "te", name: "Telugu" },
      ],
      modes: ["native", "mixed", "romanised"],
      byModel: {},
    });
    expect(
      normalizeSpeechLanguages({
        languages: [{ code: "TE", name: "Telugu" }, "sa"],
      }).languages,
    ).toEqual([
      { code: "te", name: "Telugu" },
      { code: "sa", name: "sa" },
    ]);
  });
});

describe("the live server's payloads", () => {
  it("reads what each model does, the defaults and the download status", () => {
    const models = normalizeSpeechModels(LIVE_MODELS);
    expect(ttsModels(models).map((m) => m.id)).toEqual([
      "indic-speak-mlx",
      "kokoro-82m",
      "tts-1",
    ]);
    expect(asrModels(models).map((m) => m.id)).toEqual([
      "whisper-large-v3",
      "indic-transcribe",
      "whisper-1",
    ]);
    expect(speechModelLabel(models[4])).toBe(
      "tts-1 (OpenAI alias → kokoro-82m)",
    );
    // the default, not the first
    expect(asrModel(models)).toBe("indic-transcribe");
    expect(speechModelLabel(models[2])).toBe("whisper-large-v3 (not downloaded)");
    expect(speechModelLabel(models[0])).toBe("indic-speak-mlx");
  });

  it("keeps voices and styles per model", () => {
    const catalog = normalizeSpeechVoices(LIVE_VOICES);
    const kokoro = voiceCatalogFor(catalog, "kokoro-82m");
    expect(kokoro.voices.map((v) => v.name)).toEqual(["af_heart"]);
    expect(kokoro.styles).toEqual([]);
    expect(kokoro.aliases).toEqual({ alloy: "af_alloy" });
    // "en-us" speaks English
    expect(pickVoiceForLanguage(kokoro, "en")).toBe("af_heart");
    // a model the server did not break out: the default's voices
    expect(voiceCatalogFor(catalog, "tts-1").voices[0].name).toBe("Amit");
  });

  it("keeps languages and modes per transcribing model", () => {
    const catalog = normalizeSpeechLanguages(LIVE_LANGUAGES);
    expect(catalog.byModel["whisper-large-v3"].modes).toEqual(["native"]);
    expect(
      catalog.byModel["whisper-large-v3"].languages.map((l) => l.code),
    ).toEqual(["auto", "fr", "te"]);
    expect(catalog.byModel["indic-transcribe"].modes).toHaveLength(3);
  });

  it("offers the default speaking model and each model's voices", async () => {
    process.env.TTS_UTILS_URL = "http://host:8000";
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/v1/models")) return json(LIVE_MODELS);
      if (url.endsWith("/v1/audio/voices")) return json(LIVE_VOICES);
      return json(LIVE_LANGUAGES);
    });
    const options = await loadSpeechOptions();
    expect(options.models.map((m) => m.id)).toEqual([
      "indic-speak-mlx",
      "kokoro-82m",
      "tts-1",
    ]);
    expect(options.defaultModel).toBe("indic-speak-mlx");
    // an alias has the voices of the model it stands for
    expect(options.byModel["tts-1"]).toBe(options.byModel["kokoro-82m"]);
  });

  it("lists what the transcription server can do", async () => {
    process.env.TTS_UTILS_URL = "http://host:8000";
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/v1/models") ? json(LIVE_MODELS) : json(LIVE_LANGUAGES),
    );
    const options = await loadTranscribeOptions();
    expect(options.live).toBe(true);
    expect(options.models.map((m) => m.id)).toEqual([
      "whisper-large-v3",
      "indic-transcribe",
      "whisper-1",
    ]);
    expect(options.defaultModel).toBe("indic-transcribe");
    expect(options.byModel["whisper-1"].modes).toEqual(["native"]);
    expect(options.modes).toEqual(["native", "mixed", "romanised"]);
    expect(options.byModel["whisper-large-v3"].modes).toEqual(["native"]);
  });

  it("has nothing to offer when the server is down or not set up", async () => {
    expect((await loadTranscribeOptions()).live).toBe(false);
    process.env.TTS_UTILS_URL = "http://host:8000";
    fetchMock.mockRejectedValue(new Error("down"));
    expect(await loadTranscribeOptions()).toMatchObject({
      models: [],
      defaultModel: "",
      languages: [],
      live: false,
    });
  });

  it("sends the chosen transcription model", async () => {
    fetchMock.mockResolvedValueOnce(json({ text: "ok" }));
    await transcribe(
      { baseUrl: "http://host:8000/v1", model: "indic-transcribe" },
      new Blob(["x"]),
      "a.webm",
      { model: "whisper-large-v3" },
    );
    expect((fetchMock.mock.calls[0][1].body as FormData).get("model")).toBe(
      "whisper-large-v3",
    );
  });
});

describe("language codes", () => {
  it("maps app script codes to speech languages and back", () => {
    expect(speechLangForApp("TEL")).toBe("te");
    expect(speechLangForApp("IAST")).toBe("sa");
    expect(speechLangForApp("ENG")).toBe("en");
    expect(speechLangForApp("XYZ")).toBeUndefined();
    expect(appLangForSpeech("te")).toBe("TEL");
    expect(appLangForSpeech("hi")).toBe("HIN");
    expect(appLangsForSpeech("sa")).toEqual(["SAN", "IAST", "ITRANS", "SLP1"]);
    expect(appLangsForSpeech("xx")).toEqual([]);
  });

  const texts = [
    { language: "TEL", value: "**శ్రీ రామ**  జయం\n\n> రామ" },
    { language: "IAST", value: "śrī rāma" },
    { language: "SLP1", value: "$transliterateFrom=SAN|TEL" },
    { language: "ENG", value: "" },
  ];

  it("finds the verse's text for a speech language", () => {
    expect(verseTextForSpeech(texts, "te")).toBe("శ్రీ రామ జయం\nరామ");
    // no Devanagari: the romanised text stands in
    expect(verseTextForSpeech(texts, "sa")).toBe("śrī rāma");
    expect(verseTextForSpeech(texts, "en")).toBe("");
    expect(verseTextForSpeech(null, "te")).toBe("");
    expect([...speechLangsOnVerse(texts)]).toEqual(["te", "sa"]);
  });

  it("starts with the language being read when the verse has it", () => {
    const languages = normalizeSpeechLanguages(LANGUAGES).languages;
    expect(pickSpeechLanguage(languages, texts, "IAST")).toBe("sa");
    expect(pickSpeechLanguage(languages, texts, "TEL")).toBe("te");
    // English is not on the verse: the first language that is
    expect(pickSpeechLanguage(languages, texts, "ENG")).toBe("sa");
    expect(pickSpeechLanguage(languages, [], "TEL")).toBe("te");
    expect(pickSpeechLanguage([], [], undefined)).toBe("te");
  });
});

describe("voices and styles", () => {
  const catalog = normalizeSpeechVoices(VOICES);

  it("labels voices and aliases", () => {
    expect(speechVoiceLabel(catalog.voices[1])).toBe(
      "Sravani (Female · Telugu) — Bright register, vivid and engaging",
    );
    expect(speechVoiceLabel({ name: "Amit" })).toBe("Amit");
    expect(speechAliasLabel("alloy", "Amit")).toBe("alloy (OpenAI alias → Amit)");
  });

  it("puts the voices of the chosen language first", () => {
    expect(
      sortVoicesForLanguage(catalog.voices, "te").map((v) => v.name),
    ).toEqual(["Sravani", "Amit"]);
    expect(sortVoicesForLanguage(catalog.voices, "ta")).toEqual(catalog.voices);
  });

  it("picks a voice that speaks the language", () => {
    expect(pickVoiceForLanguage(catalog, "te")).toBe("Sravani");
    expect(pickVoiceForLanguage(catalog, "hi", "alloy")).toBe("alloy");
    // the remembered voice speaks another language
    expect(pickVoiceForLanguage(catalog, "te", "Amit")).toBe("Sravani");
    // nobody speaks Tamil: keep what was used, else the first on offer
    expect(pickVoiceForLanguage(catalog, "ta", "Sravani")).toBe("Sravani");
    expect(pickVoiceForLanguage(catalog, "ta", "gone")).toBe("Amit");
    expect(
      pickVoiceForLanguage({ voices: [], aliases: { alloy: "Amit" } }, "te"),
    ).toBe("alloy");
  });

  it("makes styles and speeds readable", () => {
    expect(speechStyleLabel("NEUTRAL")).toBe("Neutral");
    expect(speechStyleLabel("children's stories")).toBe("Children's stories");
    expect(speechStyleLabel("AIR style news")).toBe("AIR style news");
    expect(speechStyleLabel("single person narration audiobook")).toBe(
      "Audiobook narration",
    );
    expect(speechSpeedLabel(0.75)).toBe("0.75x");
    expect(speechSpeedLabel(1)).toBe("1.0x (normal)");
    expect(speechSpeedLabel(1.1)).toBe("1.1x");
  });
});
