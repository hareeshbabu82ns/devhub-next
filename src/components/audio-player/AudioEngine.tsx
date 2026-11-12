"use client";

import { useEffect, useRef, useState } from "react";
import { useAudioPlayerContext } from "react-use-audio-player";
import { toast } from "sonner";
import { useAudioQueue } from "@/hooks/use-audio-queue";
import { audioFormat, currentTrack, PersistedQueue } from "@/lib/audio/queue";
import {
  LS_AUDIO_PLAYER_VOLUME,
  LS_AUDIO_QUEUE,
  LS_AUDIO_QUEUE_POSITION,
} from "@/lib/constants";

const SAVE_POSITION_EVERY_MS = 5000;
const SEEK_STEP = 10;

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable: the queue just won't survive a reload
  }
};

/**
 * Drives the one audio element from the play queue. Mounted once in the app
 * layout and renders nothing — the visible players only read state and
 * dispatch queue actions, so any number of them can be on screen.
 *
 * Also keeps the queue across reloads and feeds the OS media controls
 * (lock screen, headset buttons, keyboard media keys).
 */
export default function AudioEngine() {
  const player = useAudioPlayerContext();
  const [queue, dispatch] = useAudioQueue();
  const current = currentTrack(queue);

  // the player's methods are re-created on every render; effects and OS
  // callbacks reach the latest ones through these
  const playerRef = useRef(player);
  playerRef.current = player;
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const loadedSrc = useRef<string | null>(null);
  const failedSrc = useRef<string | null>(null);
  const handledToken = useRef(queue.playToken);
  const [hydrated, setHydrated] = useState(false);

  // bring back the queue of the previous visit, paused where it was left
  useEffect(() => {
    const saved = readJson<PersistedQueue>(LS_AUDIO_QUEUE);
    if (saved?.tracks?.length && queueRef.current.tracks.length === 0) {
      const at = readJson<{ src: string; position: number }>(
        LS_AUDIO_QUEUE_POSITION,
      );
      const resumeSrc = saved.tracks[saved.index]?.src;
      dispatch({
        type: "restore",
        saved,
        resumeAt: at && at.src === resumeSrc ? at.position || 0 : 0,
      });
    }
    setHydrated(true);
  }, [dispatch]);

  useEffect(() => {
    if (!hydrated) return;
    const saved: PersistedQueue = {
      tracks: queue.tracks,
      index: queue.index,
      repeat: queue.repeat,
      source: queue.source,
    };
    writeJson(LS_AUDIO_QUEUE, saved);
  }, [hydrated, queue.tracks, queue.index, queue.repeat, queue.source]);

  // load / start whatever the queue points at
  const src = current?.src ?? null;
  useEffect(() => {
    const p = playerRef.current;
    const { autoplay, resumeAt, playToken } = queueRef.current;
    const restart = handledToken.current !== playToken;
    handledToken.current = playToken;

    if (!src) {
      if (loadedSrc.current) {
        p.stop();
        p.cleanup();
        loadedSrc.current = null;
      }
      return;
    }

    // same file again: repeat-one, a one-track queue, "play" on the current
    if (loadedSrc.current === src) {
      if (!restart) return;
      if (autoplay) {
        p.seek(0);
        p.play();
      } else {
        p.stop();
      }
      return;
    }

    loadedSrc.current = src;
    const volume = readJson<number>(LS_AUDIO_PLAYER_VOLUME);
    p.load(src, {
      autoplay,
      // streamed through an <audio> element: starts before the file is fully
      // downloaded and keeps playing with the screen locked
      html5: true,
      format: audioFormat(src),
      initialVolume: typeof volume === "number" ? volume : 1,
      // the chosen speed carries over from verse to verse
      initialRate: p.rate || 1,
      loop: false,
      onload: () => {
        if (resumeAt > 0) playerRef.current.seek(resumeAt);
      },
      onend: () => dispatch({ type: "ended" }),
    });
  }, [src, queue.playToken, dispatch]);

  // a file that cannot be played must not stall a whole chapter
  useEffect(() => {
    if (!player.error || !current || player.src !== current.src) return;
    if (failedSrc.current === current.src) return;
    failedSrc.current = current.src;
    toast.error(`Could not play "${current.title}"`);
    const q = queueRef.current;
    if (q.autoplay && q.index < q.tracks.length - 1) {
      dispatch({ type: "next" });
    }
  }, [player.error, player.src, current, dispatch]);

  // remember how far into the track we are
  useEffect(() => {
    if (!hydrated || !src) return;
    const save = () => {
      const position = playerRef.current.getPosition();
      if (typeof position === "number") {
        writeJson(LS_AUDIO_QUEUE_POSITION, { src, position });
      }
    };
    if (!player.isPlaying) {
      // paused: keep the exact spot (but not the 0 of a track still loading)
      if (player.isReady) save();
      return;
    }
    const timer = window.setInterval(save, SAVE_POSITION_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [hydrated, src, player.isPlaying, player.isReady]);

  // OS media controls
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }
    const seekBy = (seconds: number) => {
      const p = playerRef.current;
      const target = p.getPosition() + seconds;
      p.seek(Math.max(0, p.duration ? Math.min(p.duration, target) : target));
    };
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => playerRef.current.play()],
      ["pause", () => playerRef.current.pause()],
      ["previoustrack", () => dispatch({ type: "prev" })],
      ["nexttrack", () => dispatch({ type: "next" })],
      ["seekbackward", (d) => seekBy(-(d.seekOffset || SEEK_STEP))],
      ["seekforward", (d) => seekBy(d.seekOffset || SEEK_STEP)],
      [
        "seekto",
        (d) => {
          if (typeof d.seekTime === "number") {
            playerRef.current.seek(d.seekTime);
          }
        },
      ],
    ];
    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // not every browser knows every action
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {}
      }
    };
  }, [dispatch]);

  const sourceLabel = queue.source?.label;
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }
    if (!current || typeof MediaMetadata === "undefined") {
      navigator.mediaSession.metadata = null;
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.subtitle ?? "",
      album: sourceLabel ?? "",
      artwork: [
        { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
        { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
      ],
    });
  }, [current, sourceLabel]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }
    navigator.mediaSession.playbackState = !current
      ? "none"
      : player.isPlaying
        ? "playing"
        : "paused";
  }, [current, player.isPlaying]);

  return null;
}
