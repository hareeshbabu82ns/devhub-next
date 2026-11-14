"use client";

import { useEffect, useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchSpeechOptions } from "@/app/(app)/entities/actions";
import {
  sortVoicesForLanguage,
  speechAliasLabel,
  speechModelLabel,
  speechVoiceLabel,
  voiceCatalogFor,
  type TranscribeOptions,
} from "@/lib/audio/speech-options";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  INPUT_LANGUAGES,
  serverInputLang,
  type SpeechSettings,
} from "./use-speech-settings";

const MODE_LABELS: Record<string, string> = {
  native: "Native script",
  mixed: "Native script, numbers as digits",
  romanised: "Romanised (Latin letters)",
};
const modeLabel = (mode: string) =>
  MODE_LABELS[mode] ?? mode.charAt(0).toUpperCase() + mode.slice(1);

// Radix Select cannot hold an empty value
const AUTO = "auto";
const toSelect = (v: string) => v || AUTO;
const fromSelect = (v: string) => (v === AUTO ? "" : v);

interface AskAIVoiceSettingsProps {
  settings: SpeechSettings;
  onChange: (patch: Partial<SpeechSettings>) => void;
  voices: SpeechSynthesisVoice[];
  server: {
    transcribe: boolean;
    speak: boolean;
    speakVia?: ("library" | "model")[];
  };
  browserRecognition: boolean;
  /** which engine voice input will actually use, if any */
  inputEngine: "browser" | "server" | null;
}

/** Voice input and read-aloud preferences for Ask AI. */
export default function AskAIVoiceSettings({
  settings,
  onChange,
  voices,
  server,
  browserRecognition,
  inputEngine,
}: AskAIVoiceSettingsProps) {
  const id = useId();
  // voices for the languages the library is in come first
  const sortedVoices = [...voices].sort((a, b) => {
    const rank = (v: SpeechSynthesisVoice) =>
      /^(en|hi|te|sa|kn|ta)/i.test(v.lang) ? 0 : 1;
    return rank(a) - rank(b) || a.lang.localeCompare(b.lang);
  });

  // voices and models of the library's speech server
  const usesLibrary =
    settings.outputEngine === "server" &&
    server.speak &&
    !!server.speakVia?.includes("library");
  const { data: library } = useQuery({
    queryKey: ["speechOptions"],
    queryFn: () => fetchSpeechOptions(),
    enabled: usesLibrary,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  // voices differ between models
  const libraryCatalog = library
    ? voiceCatalogFor(library, settings.serverModel || library.defaultModel)
    : undefined;
  const libraryVoices = sortVoicesForLanguage(
    libraryCatalog?.voices ?? [],
    serverInputLang(settings),
  );
  const libraryAliases = Object.entries(libraryCatalog?.aliases ?? {}).filter(
    ([alias]) => !libraryVoices.some((v) => v.name === alias),
  );
  const knowsVoice = (name: string) =>
    libraryVoices.some((v) => v.name === name) ||
    libraryAliases.some(([alias]) => alias === name);
  const knowsModel = (name: string) =>
    !!library?.models.some((m) => m.id === name);

  // a saved voice or model the server no longer has would fail every request
  useEffect(() => {
    if (!library?.live) return;
    if (settings.serverVoice && !knowsVoice(settings.serverVoice)) {
      onChange({ serverVoice: "" });
    }
    if (settings.serverModel && !knowsModel(settings.serverModel)) {
      onChange({ serverModel: "" });
    }
    // only when the server's lists arrive or another model is chosen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, settings.serverModel]);

  // what the transcription server can do: models, languages, scripts
  const { data: stt } = useQuery({
    queryKey: ["transcribeOptions"],
    queryFn: async (): Promise<TranscribeOptions> => {
      const res = await fetch("/api/ai/transcribe");
      if (!res.ok) throw new Error(`Speech options failed (${res.status})`);
      return res.json();
    },
    enabled: server.transcribe,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const onServer = inputEngine === "server";
  const sttModel =
    stt?.models.find((m) => m.id === settings.sttModel)?.id ?? "";
  // languages and scripts differ between models
  const sttCatalog =
    stt?.byModel[sttModel || stt.defaultModel] ?? stt ?? undefined;
  const sttLanguages = (sttCatalog?.languages ?? []).filter(
    (l) => l.code !== "auto",
  );
  const sttModes = sttCatalog?.modes ?? [];
  const sttLang = serverInputLang(settings);

  // a saved model, language or script the server does not have would fail
  // every recording
  useEffect(() => {
    if (!stt?.live) return;
    const patch: Partial<SpeechSettings> = {};
    if (settings.sttModel && !sttModel) patch.sttModel = "";
    if (
      settings.sttLang &&
      settings.sttLang !== "auto" &&
      sttLanguages.length > 0 &&
      !sttLanguages.some((l) => l.code === settings.sttLang)
    ) {
      patch.sttLang = "";
    }
    if (settings.sttMode && !sttModes.includes(settings.sttMode)) {
      patch.sttMode = "";
    }
    if (Object.keys(patch).length > 0) onChange(patch);
    // only when the server's lists arrive or another model is chosen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stt, settings.sttModel]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-10 shrink-0"
          title="Voice settings"
          aria-label="Voice settings"
        >
          <AudioLines className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={16}
        className="flex max-h-[min(36rem,calc(100dvh-6rem))] w-[min(22rem,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto"
      >
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Speak your question</h3>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-in-engine`}>Recognizer</Label>
            <Select
              value={settings.inputEngine}
              onValueChange={(v) =>
                onChange({ inputEngine: v as SpeechSettings["inputEngine"] })
              }
            >
              <SelectTrigger id={`${id}-in-engine`} className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatic</SelectItem>
                <SelectItem value="browser" disabled={!browserRecognition}>
                  Browser
                </SelectItem>
                <SelectItem value="server" disabled={!server.transcribe}>
                  Local speech server
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {inputEngine === "server"
                ? "Recorded audio goes only to your own speech server."
                : inputEngine === "browser"
                  ? "Uses the browser's recognizer. Chrome and Edge send audio to their online service; Safari may recognize on the device."
                  : "Voice input is not available here. Use Chrome, Edge or Safari, or set TTS_UTILS_URL or AI_STT_BASE_URL to a local speech server."}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-in-lang`}>Language you speak</Label>
            {onServer && sttLanguages.length > 0 ? (
              // what the speech server understands
              <Select
                value={
                  sttLang && sttLanguages.some((l) => l.code === sttLang)
                    ? sttLang
                    : AUTO
                }
                onValueChange={(v) => onChange({ sttLang: v })}
              >
                <SelectTrigger id={`${id}-in-lang`} className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value={AUTO}>Detect automatically</SelectItem>
                  {sttLanguages.map((l) => (
                    <SelectItem key={l.code} value={l.code}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={toSelect(settings.inputLang)}
                onValueChange={(v) => onChange({ inputLang: fromSelect(v) })}
              >
                <SelectTrigger id={`${id}-in-lang`} className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INPUT_LANGUAGES.map((l) => (
                    <SelectItem key={l.label} value={toSelect(l.value)}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {onServer && !!stt && stt.models.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-in-model`}>Transcription model</Label>
              <Select
                value={sttModel || AUTO}
                onValueChange={(v) => onChange({ sttModel: fromSelect(v) })}
              >
                <SelectTrigger
                  id={`${id}-in-model`}
                  className="h-10 [&>span]:truncate"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72 max-w-[calc(100vw-2rem)]">
                  <SelectItem value={AUTO}>
                    Server default
                    {stt.defaultModel ? ` (${stt.defaultModel})` : ""}
                  </SelectItem>
                  {stt.models.map((m) => (
                    <SelectItem key={m.id} value={m.id} title={m.description}>
                      {speechModelLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {onServer && sttModes.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-in-mode`}>Write the transcript in</Label>
              <Select
                value={
                  sttModes.includes(settings.sttMode) ? settings.sttMode : AUTO
                }
                onValueChange={(v) => onChange({ sttMode: fromSelect(v) })}
              >
                <SelectTrigger id={`${id}-in-mode`} className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTO}>Server default</SelectItem>
                  {sttModes.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {modeLabel(mode)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`${id}-auto-send`}>Ask as soon as I stop</Label>
            <Switch
              id={`${id}-auto-send`}
              checked={settings.autoSend}
              onCheckedChange={(autoSend) => onChange({ autoSend })}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3 border-t pt-4">
          <h3 className="text-sm font-semibold">Read answers aloud</h3>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-out-engine`}>Voice source</Label>
            <Select
              value={
                settings.outputEngine === "server" && server.speak
                  ? "server"
                  : "browser"
              }
              onValueChange={(v) =>
                onChange({ outputEngine: v as SpeechSettings["outputEngine"] })
              }
            >
              <SelectTrigger id={`${id}-out-engine`} className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="server" disabled={!server.speak}>
                  Local voice servers
                </SelectItem>
                <SelectItem value="browser">Device voices only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {server.speak
                ? `Tries ${[
                    ...(server.speakVia ?? []).map((s) =>
                      s === "library"
                        ? "the library TTS server"
                        : "the speech model",
                    ),
                    "this device's voice",
                  ].join(", then ")}.`
                : "No local voice server is set up (TTS_UTILS_URL or AI_TTS_MODEL), so this device's voices are used."}
            </p>
          </div>
          {usesLibrary && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-server-voice`}>Server voice</Label>
                <Select
                  value={
                    knowsVoice(settings.serverVoice)
                      ? settings.serverVoice
                      : AUTO
                  }
                  onValueChange={(v) => onChange({ serverVoice: fromSelect(v) })}
                >
                  <SelectTrigger
                    id={`${id}-server-voice`}
                    className="h-10 [&>span]:truncate"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 max-w-[calc(100vw-2rem)]">
                    <SelectItem value={AUTO}>Server default</SelectItem>
                    {libraryVoices.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Voices</SelectLabel>
                        {libraryVoices.map((v) => (
                          <SelectItem key={v.name} value={v.name}>
                            {speechVoiceLabel(v)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    {libraryAliases.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>OpenAI names</SelectLabel>
                        {libraryAliases.map(([alias, target]) => (
                          <SelectItem key={alias} value={alias}>
                            {speechAliasLabel(alias, target)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-server-model`}>Server model</Label>
                <Select
                  value={
                    knowsModel(settings.serverModel)
                      ? settings.serverModel
                      : AUTO
                  }
                  onValueChange={(v) => onChange({ serverModel: fromSelect(v) })}
                >
                  <SelectTrigger
                    id={`${id}-server-model`}
                    className="h-10 [&>span]:truncate"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 max-w-[calc(100vw-2rem)]">
                    <SelectItem value={AUTO}>
                      Server default
                      {library ? ` (${library.defaultModel})` : ""}
                    </SelectItem>
                    {library?.models.map((m) => (
                      <SelectItem key={m.id} value={m.id} title={m.description}>
                        {speechModelLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {library && !library.live
                    ? "The library speech server did not answer, so these are the standard options."
                    : "Used by the library speech server. Voices differ between models; those for the language you speak come first."}
                </p>
              </div>
            </>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-voice`}>
              {settings.outputEngine === "server" && server.speak
                ? "Device voice (fallback)"
                : "Voice"}
            </Label>
            <Select
              value={
                voices.some((v) => v.voiceURI === settings.voiceURI)
                  ? settings.voiceURI
                  : AUTO
              }
              onValueChange={(v) => onChange({ voiceURI: fromSelect(v) })}
            >
              <SelectTrigger id={`${id}-voice`} className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO}>Automatic per language</SelectItem>
                {sortedVoices.map((v) => (
                  <SelectItem key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sanskrit and Telugu passages switch to a Hindi or Telugu voice
              when the device has one.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${id}-rate`}>Speed</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {settings.rate.toFixed(2).replace(/0$/, "")}×
              </span>
            </div>
            <Slider
              id={`${id}-rate`}
              min={0.5}
              max={2}
              step={0.05}
              value={[settings.rate]}
              onValueChange={([rate]) => onChange({ rate })}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`${id}-auto-read`}>Read new answers aloud</Label>
            <Switch
              id={`${id}-auto-read`}
              checked={settings.autoRead}
              onCheckedChange={(autoRead) => onChange({ autoRead })}
            />
          </div>
        </section>
      </PopoverContent>
    </Popover>
  );
}
