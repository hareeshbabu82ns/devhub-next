"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeechSettings } from "./use-speech-settings";

// The Web Speech API is not in the TypeScript DOM library yet.
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionEvent = {
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

const recognitionClass = (): (new () => Recognition) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => Recognition)
    | null;
};

const RECORDING_TYPES = [
  ["audio/webm;codecs=opus", "speech.webm"],
  ["audio/webm", "speech.webm"],
  ["audio/mp4", "speech.m4a"],
  ["audio/ogg;codecs=opus", "speech.ogg"],
] as const;

const MAX_RECORDING_MS = 2 * 60 * 1000;

const recognitionError = (code: string) =>
  ({
    "not-allowed": "Microphone access was blocked",
    "service-not-allowed": "Speech input is not allowed in this browser",
    network: "The browser's speech service could not be reached",
    "no-speech": "No speech was heard",
    "audio-capture": "No microphone was found",
    "language-not-supported": "This language is not supported by the browser",
  })[code] ?? `Speech input failed (${code})`;

export type DictationState = "idle" | "listening" | "transcribing";

/**
 * Speech to text for the question box: the browser's recognizer, or a
 * recording sent to the local transcription server.
 * `onText` receives the running transcript; `onDone` the final one.
 */
export function useDictation(
  settings: SpeechSettings,
  serverAvailable: boolean,
  onText: (text: string) => void,
  onDone: (text: string) => void,
) {
  const [state, setState] = useState<DictationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [browserSupported, setBrowserSupported] = useState(false);
  const [recorderSupported, setRecorderSupported] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const callbacks = useRef({ onText, onDone });
  callbacks.current = { onText, onDone };

  // feature checks after mount, so server and client render the same
  useEffect(() => {
    setBrowserSupported(!!recognitionClass());
    setRecorderSupported(
      typeof MediaRecorder !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia,
    );
  }, []);

  const serverUsable = serverAvailable && recorderSupported;
  const engine: "browser" | "server" | null =
    settings.inputEngine === "server"
      ? serverUsable
        ? "server"
        : null
      : settings.inputEngine === "browser"
        ? browserSupported
          ? "browser"
          : null
        : serverUsable
          ? "server"
          : browserSupported
            ? "browser"
            : null;

  const startBrowser = () => {
    const Rec = recognitionClass()!;
    const rec = new Rec();
    rec.lang = settings.inputLang || navigator.language || "en-US";
    rec.interimResults = true;
    // one question at a time: stop at the first pause
    rec.continuous = false;
    let transcript = "";
    rec.onresult = (e) => {
      transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("")
        .trim();
      callbacks.current.onText(transcript);
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted") setError(recognitionError(e.error));
    };
    rec.onend = () => {
      recognitionRef.current = null;
      setState("idle");
      if (transcript && !cancelledRef.current)
        callbacks.current.onDone(transcript);
    };
    recognitionRef.current = rec;
    rec.start();
    setState("listening");
  };

  const startServer = async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access was blocked");
      return;
    }
    const [mimeType, filename] =
      RECORDING_TYPES.find(([t]) => MediaRecorder.isTypeSupported(t)) ??
      (["", "speech.webm"] as const);
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = async () => {
      clearTimeout(timerRef.current);
      stream.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      if (cancelledRef.current || chunks.length === 0) {
        setState("idle");
        return;
      }
      setState("transcribing");
      try {
        const form = new FormData();
        form.append(
          "audio",
          new Blob(chunks, { type: recorder.mimeType || mimeType }),
          filename,
        );
        if (settings.inputLang) {
          form.append("language", settings.inputLang.split("-")[0]);
        }
        const res = await fetch("/api/ai/transcribe", {
          method: "POST",
          body: form,
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? "Transcription failed");
        const text = (body?.text as string) ?? "";
        if (!text) setError("No speech was heard");
        else if (!cancelledRef.current) {
          callbacks.current.onText(text);
          callbacks.current.onDone(text);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Transcription failed");
      } finally {
        setState("idle");
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setState("listening");
    timerRef.current = setTimeout(() => recorder.stop(), MAX_RECORDING_MS);
  };

  const start = useCallback(() => {
    if (!engine || state !== "idle") return;
    setError(null);
    cancelledRef.current = false;
    try {
      if (engine === "browser") startBrowser();
      else void startServer();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speech input failed");
      setState("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, state, settings.inputLang]);

  /** Finish listening and use what was heard. */
  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  /** Stop listening and throw away what was heard. */
  const cancel = useCallback(() => {
    cancelledRef.current = true;
    recognitionRef.current?.abort();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  useEffect(() => cancel, [cancel]);

  return {
    state,
    error,
    engine,
    available: engine !== null,
    browserSupported,
    serverUsable,
    start,
    stop,
    cancel,
  };
}
