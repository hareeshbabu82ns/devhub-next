"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { speechLangFor, splitForSpeech, toSpeakable } from "@/lib/speech-text";
import type { SpeechSettings } from "./use-speech-settings";

// a WAV with no samples: played inside a tap so iOS lets later audio start
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

const langMatches = (voiceLang: string, lang: string) =>
  voiceLang.toLowerCase().replace("_", "-").startsWith(lang.split("-")[0]);

/** Browser voices, which load asynchronously in most browsers. */
export function useBrowserVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);
  return voices;
}

/**
 * Reads answers aloud, one sentence group at a time. With the server engine
 * the local voice servers are tried first (library TTS, then the speech
 * model); when they fail the rest is read with the browser's voices.
 * Only one answer plays at once.
 */
export function useReadAloud(
  settings: SpeechSettings,
  serverAvailable: boolean,
) {
  const voices = useBrowserVoices();
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const runRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [browserSupported, setBrowserSupported] = useState(false);
  useEffect(() => setBrowserSupported("speechSynthesis" in window), []);
  const engine =
    settings.outputEngine === "server" && serverAvailable
      ? "server"
      : "browser";
  const supported = engine === "server" || browserSupported;
  const supportedRef = useRef(browserSupported);
  supportedRef.current = browserSupported;

  const audio = () => (audioRef.current ??= new Audio());

  const stop = useCallback(() => {
    runRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    audioRef.current?.pause();
    setSpeakingKey(null);
  }, []);

  useEffect(() => stop, [stop]);

  /** Call inside a tap or key press so a later automatic read may play. */
  const prime = useCallback(() => {
    if (engine === "server") {
      const a = audio();
      a.src = SILENT_WAV;
      a.play().catch(() => {});
    }
    // also for the server engine, which may fall back to the browser
    if (browserSupported) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    }
  }, [engine, browserSupported]);

  const pickVoice = useCallback(
    (lang: string) => {
      const chosen = voices.find((v) => v.voiceURI === settings.voiceURI);
      if (chosen && langMatches(chosen.lang, lang)) return chosen;
      const matching = voices.filter((v) => langMatches(v.lang, lang));
      return (
        matching.find((v) => v.lang.replace("_", "-") === lang) ??
        matching.find((v) => v.localService) ??
        matching[0]
      );
    },
    [voices, settings.voiceURI],
  );

  const speakBrowser = (pieces: string[], run: number) =>
    new Promise<void>((resolve, reject) => {
      const synth = window.speechSynthesis;
      synth.cancel();
      pieces.forEach((piece, i) => {
        const utterance = new SpeechSynthesisUtterance(piece);
        const lang = speechLangFor(piece, navigator.language || "en");
        utterance.lang = lang;
        const voice = pickVoice(lang);
        if (voice) utterance.voice = voice;
        utterance.rate = settings.rate;
        if (i === pieces.length - 1) utterance.onend = () => resolve();
        utterance.onerror = (e) => {
          if (run !== runRef.current) return resolve();
          if (e.error === "canceled" || e.error === "interrupted") resolve();
          else reject(new Error(`Could not read aloud (${e.error})`));
        };
        synth.speak(utterance);
      });
    });

  /** Plays pieces from the voice servers; returns the index it stopped at
   *  when they failed, so the caller can read the rest another way. */
  const speakServer = async (
    pieces: string[],
    run: number,
  ): Promise<number | null> => {
    const controller = new AbortController();
    abortRef.current = controller;
    const fetchPiece = async (text: string) => {
      const res = await fetch("/api/ai/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Speech failed (${res.status})`);
      }
      return URL.createObjectURL(await res.blob());
    };
    const player = audio();
    player.playbackRate = settings.rate;
    const prefetch = (i: number) => {
      const p = fetchPiece(pieces[i]);
      p.catch(() => {}); // handled when awaited
      return p;
    };
    // fetch the next piece while the current one plays
    let next = prefetch(0);
    for (let i = 0; i < pieces.length; i++) {
      let url: string;
      try {
        url = await next;
      } catch (e) {
        if (controller.signal.aborted || run !== runRef.current) return null;
        console.warn("Voice server failed, using the device voice:", e);
        return i;
      }
      if (run !== runRef.current) {
        URL.revokeObjectURL(url);
        return null;
      }
      if (i + 1 < pieces.length) next = prefetch(i + 1);
      try {
        await new Promise<void>((resolve, reject) => {
          player.onended = () => resolve();
          player.onpause = () => resolve();
          player.onerror = () => reject(new Error("Could not play the audio"));
          player.src = url;
          player.playbackRate = settings.rate;
          player.play().catch(reject);
        });
      } finally {
        URL.revokeObjectURL(url);
      }
      if (run !== runRef.current) return null;
    }
    return null;
  };

  const speak = useCallback(
    async (key: string, markdown: string) => {
      stop();
      const pieces = splitForSpeech(toSpeakable(markdown));
      if (pieces.length === 0 || !supported) return;
      const run = runRef.current;
      setError(null);
      setNotice(null);
      setSpeakingKey(key);
      try {
        let from: number | null = 0;
        if (engine === "server") from = await speakServer(pieces, run);
        if (from !== null && run === runRef.current) {
          if (!supportedRef.current) {
            throw new Error("The voice server could not read this aloud");
          }
          if (engine === "server") {
            setNotice("Voice server unavailable; using this device's voice.");
          }
          await speakBrowser(pieces.slice(from), run);
        }
      } catch (e) {
        if (run === runRef.current && !abortRef.current?.signal.aborted) {
          setError(e instanceof Error ? e.message : "Could not read aloud");
        }
      } finally {
        if (run === runRef.current) setSpeakingKey(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stop, supported, engine, pickVoice, settings.rate],
  );

  return { speak, stop, prime, speakingKey, error, notice, supported, voices };
}
