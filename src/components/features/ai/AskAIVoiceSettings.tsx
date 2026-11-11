"use client";

import { useId } from "react";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { INPUT_LANGUAGES, type SpeechSettings } from "./use-speech-settings";

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
                  : "Voice input is not available here. Use Chrome, Edge or Safari, or set AI_STT_BASE_URL to a local Whisper server."}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-in-lang`}>Language you speak</Label>
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
          </div>
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
