"use client";

import { useCallback, useEffect, useState } from "react";

export type SpeechSettings = {
  /** auto: the local server when there is one, else the browser */
  inputEngine: "auto" | "browser" | "server";
  /** BCP 47 tag; "" follows the browser's language */
  inputLang: string;
  /** send the question as soon as speaking ends */
  autoSend: boolean;
  /** server: local voice servers first, the browser's voices as fallback */
  outputEngine: "browser" | "server";
  /** a browser voice; "" picks one per language */
  voiceURI: string;
  rate: number;
  /** read each new answer aloud when it finishes */
  autoRead: boolean;
};

export const DEFAULT_SPEECH_SETTINGS: SpeechSettings = {
  inputEngine: "auto",
  inputLang: "",
  autoSend: false,
  outputEngine: "server",
  voiceURI: "",
  rate: 1,
  autoRead: false,
};

export const INPUT_LANGUAGES = [
  { value: "", label: "Browser language" },
  { value: "en-IN", label: "English (India)" },
  { value: "en-US", label: "English (US)" },
  { value: "hi-IN", label: "Hindi" },
  { value: "te-IN", label: "Telugu" },
  { value: "sa-IN", label: "Sanskrit" },
  { value: "kn-IN", label: "Kannada" },
  { value: "ta-IN", label: "Tamil" },
];

const KEY = "ask-ai:speech-settings";

/** Voice preferences, kept in this browser only. */
export function useSpeechSettings() {
  const [settings, setSettings] = useState(DEFAULT_SPEECH_SETTINGS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved)
        setSettings({ ...DEFAULT_SPEECH_SETTINGS, ...JSON.parse(saved) });
    } catch {
      // unreadable or blocked storage: keep the defaults
    }
  }, []);

  const update = useCallback((patch: Partial<SpeechSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // not persisted; still applies for this visit
      }
      return next;
    });
  }, []);

  return [settings, update] as const;
}
