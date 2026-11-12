/**
 * The play queue: what is playing, what comes after it and how it repeats.
 *
 * Pure state transitions only — the audio element lives in AudioEngine, which
 * watches `tracks[index]` and `playToken` and loads / starts accordingly.
 */

export type Track = {
  /** Entity id, or the asset path for a file played from the asset manager. */
  id: string;
  src: string;
  title: string;
  /** Where the track sits, e.g. "Chapter 2 · 12". */
  subtitle?: string;
  /** Page showing this track's text. */
  href?: string;
};

/** What can be played for an entity: its own recording and what is under it. */
export type EntityAudio = {
  label: string;
  /** The entity's own recording, e.g. a whole chapter in one file. */
  own: Track | null;
  /** Everything below it in reading order. */
  tracks: Track[];
};

export type RepeatMode = "off" | "all" | "one";

export type QueueSource = {
  /** Entity the queue was built from (a chapter, a book). */
  id?: string;
  label: string;
};

export type QueueState = {
  tracks: Track[];
  /** Index of the current track, -1 when the queue is empty. */
  index: number;
  repeat: RepeatMode;
  source?: QueueSource;
  /** Whether the current track should start by itself once loaded. */
  autoplay: boolean;
  /** Bumped whenever the current track must (re)start from the top. */
  playToken: number;
  /** Seconds into the current track to resume at after a page reload. */
  resumeAt: number;
};

export type QueueAction =
  /** Replace the queue and start at `startIndex`. */
  | { type: "play"; tracks: Track[]; startIndex?: number; source?: QueueSource }
  /** Play one track now: jump to it when queued, otherwise play it alone. */
  | { type: "playNow"; track: Track }
  /** Insert right after the current track. */
  | { type: "playNext"; tracks: Track[] }
  /** Append to the end. */
  | { type: "enqueue"; tracks: Track[] }
  | { type: "jump"; index: number }
  | { type: "next" }
  | { type: "prev" }
  /** The current track played to its end. */
  | { type: "ended" }
  | { type: "remove"; index: number; keepPlaying?: boolean }
  | { type: "clear" }
  | { type: "cycleRepeat" }
  | { type: "restore"; saved: PersistedQueue; resumeAt?: number };

/** The part of the queue that survives a page reload. */
export type PersistedQueue = Pick<
  QueueState,
  "tracks" | "index" | "repeat" | "source"
>;

export const emptyQueue: QueueState = {
  tracks: [],
  index: -1,
  repeat: "off",
  autoplay: false,
  playToken: 0,
  resumeAt: 0,
};

const REPEAT_ORDER: RepeatMode[] = ["off", "all", "one"];

/** Drops tracks without a source and repeats of the same file. */
export const uniqueTracks = (tracks: Track[], taken?: Set<string>): Track[] => {
  const seen = new Set(taken);
  return tracks.filter((t) => {
    if (!t?.src || seen.has(t.src)) return false;
    seen.add(t.src);
    return true;
  });
};

/** Start (or restart) the track at `index`. */
const startAt = (state: QueueState, index: number): QueueState => ({
  ...state,
  index,
  autoplay: true,
  playToken: state.playToken + 1,
  resumeAt: 0,
});

export const currentTrack = (state: QueueState): Track | null =>
  state.tracks[state.index] ?? null;

export const hasNext = (state: QueueState): boolean =>
  state.index >= 0 &&
  (state.index < state.tracks.length - 1 ||
    (state.repeat === "all" && state.tracks.length > 1));

export const hasPrev = (state: QueueState): boolean =>
  state.index > 0 || (state.repeat === "all" && state.tracks.length > 1);

export function queueReducer(
  state: QueueState,
  action: QueueAction,
): QueueState {
  switch (action.type) {
    case "play": {
      const tracks = uniqueTracks(action.tracks);
      if (tracks.length === 0) return state;
      // the start track may have moved when duplicates were dropped
      const wanted = action.tracks[action.startIndex ?? 0];
      const index = Math.max(
        0,
        wanted ? tracks.findIndex((t) => t.src === wanted.src) : 0,
      );
      return startAt({ ...state, tracks, source: action.source }, index);
    }

    case "playNow": {
      if (!action.track.src) return state;
      const index = state.tracks.findIndex((t) => t.src === action.track.src);
      if (index !== -1) return startAt(state, index);
      return startAt(
        { ...state, tracks: [action.track], source: undefined },
        0,
      );
    }

    case "playNext": {
      const current = currentTrack(state);
      if (!current) {
        return queueReducer(state, { type: "play", tracks: action.tracks });
      }
      const incoming = uniqueTracks(action.tracks, new Set([current.src]));
      if (incoming.length === 0) return state;
      // a track already further down the queue moves up instead of repeating
      const moving = new Set(incoming.map((t) => t.src));
      const before = state.tracks
        .slice(0, state.index)
        .filter((t) => !moving.has(t.src));
      const after = state.tracks
        .slice(state.index + 1)
        .filter((t) => !moving.has(t.src));
      return {
        ...state,
        tracks: [...before, current, ...incoming, ...after],
        index: before.length,
      };
    }

    case "enqueue": {
      const incoming = uniqueTracks(
        action.tracks,
        new Set(state.tracks.map((t) => t.src)),
      );
      if (incoming.length === 0) return state;
      const next = { ...state, tracks: [...state.tracks, ...incoming] };
      // nothing was lined up: start with the first added track
      return state.index === -1 ? startAt(next, 0) : next;
    }

    case "jump":
      if (action.index < 0 || action.index >= state.tracks.length) return state;
      return startAt(state, action.index);

    case "next": {
      if (state.index === -1) return state;
      if (state.index < state.tracks.length - 1) {
        return startAt(state, state.index + 1);
      }
      return state.repeat === "all" ? startAt(state, 0) : state;
    }

    case "prev": {
      if (state.index === -1) return state;
      if (state.index > 0) return startAt(state, state.index - 1);
      return state.repeat === "all"
        ? startAt(state, state.tracks.length - 1)
        : startAt(state, 0);
    }

    case "ended": {
      if (state.index === -1) return state;
      if (state.repeat === "one") return startAt(state, state.index);
      if (state.index < state.tracks.length - 1) {
        return startAt(state, state.index + 1);
      }
      if (state.repeat === "all") return startAt(state, 0);
      // end of the queue: rewind to the top and wait for the listener
      return {
        ...state,
        index: 0,
        autoplay: false,
        playToken: state.playToken + 1,
        resumeAt: 0,
      };
    }

    case "remove": {
      if (action.index < 0 || action.index >= state.tracks.length) return state;
      const tracks = state.tracks.filter((_, i) => i !== action.index);
      if (tracks.length === 0) {
        return { ...emptyQueue, repeat: state.repeat, playToken: state.playToken };
      }
      if (action.index < state.index) {
        return { ...state, tracks, index: state.index - 1 };
      }
      if (action.index > state.index) return { ...state, tracks };
      // the current track went away: the one after it takes over
      return {
        ...state,
        tracks,
        index: Math.min(state.index, tracks.length - 1),
        autoplay: action.keepPlaying ?? false,
        playToken: state.playToken + 1,
        resumeAt: 0,
      };
    }

    case "clear":
      return { ...emptyQueue, repeat: state.repeat, playToken: state.playToken };

    case "cycleRepeat":
      return {
        ...state,
        repeat:
          REPEAT_ORDER[
            (REPEAT_ORDER.indexOf(state.repeat) + 1) % REPEAT_ORDER.length
          ],
      };

    case "restore": {
      const tracks = uniqueTracks(action.saved.tracks ?? []);
      if (tracks.length === 0) return state;
      const index = Math.min(
        Math.max(0, action.saved.index ?? 0),
        tracks.length - 1,
      );
      return {
        tracks,
        index,
        repeat: REPEAT_ORDER.includes(action.saved.repeat)
          ? action.saved.repeat
          : "off",
        source: action.saved.source,
        autoplay: false,
        playToken: state.playToken,
        resumeAt: action.resumeAt ?? 0,
      };
    }

    default:
      return state;
  }
}

/** A one-line track title out of verse text that may span several lines. */
export const trackTitle = (text: string | undefined, fallback = "Untitled") => {
  const line = (text ?? "")
    .split("\n")
    .map((l) => l.replace(/[#*_>`~|]/g, "").trim())
    .find((l) => l.length > 0);
  if (!line) return fallback;
  return line.length > 80 ? `${line.slice(0, 79).trimEnd()}…` : line;
};

/** Howler needs the format spelled out; asset URLs may carry a query string. */
export const audioFormat = (src: string): string => {
  const ext = src.split(/[?#]/)[0].split(".").pop()?.toLowerCase() ?? "";
  return /^(mp3|wav|ogg|oga|m4a|aac|flac|webm|opus|mp4|weba)$/.test(ext)
    ? ext
    : "mp3";
};
