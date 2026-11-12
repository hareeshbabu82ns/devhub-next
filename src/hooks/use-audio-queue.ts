import { useCallback } from "react";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { atomWithReducer } from "jotai/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  currentTrack,
  emptyQueue,
  EntityAudio,
  QueueAction,
  queueReducer,
  QueueState,
} from "@/lib/audio/queue";
import { fetchAudioTracks } from "@/app/(app)/entities/actions";
import { useLanguageAtomValue } from "./use-config";

const queueAtom = atomWithReducer<QueueState, QueueAction>(
  emptyQueue,
  queueReducer,
);
const currentTrackAtom = atom((get) => currentTrack(get(queueAtom)));
const queueSizeAtom = atom((get) => get(queueAtom).tracks.length);

export const useAudioQueue = () => useAtom(queueAtom);
export const useAudioQueueDispatch = () => useSetAtom(queueAtom);
/** The track that is loaded in the player, null when the queue is empty. */
export const useCurrentTrack = () => useAtomValue(currentTrackAtom);
export const useAudioQueueSize = () => useAtomValue(queueSizeAtom);

export type EntityPlayMode =
  /** Replace the queue: the entity's own recording, else what is under it. */
  | "play"
  /** Replace the queue with what is under it, even if it has a recording. */
  | "parts"
  | "next"
  | "enqueue";

/** What "play this chapter / book" resolves to. */
export const pickEntityTracks = (audio: EntityAudio, mode: EntityPlayMode) =>
  mode === "parts" || !audio.own ? audio.tracks : [audio.own];

/** Looks up what can be played for an entity (cached briefly). */
export function useEntityAudioLoader() {
  const queryClient = useQueryClient();
  const language = useLanguageAtomValue();
  return useCallback(
    (id: string) =>
      queryClient.fetchQuery({
        queryKey: ["entityAudio", id, language],
        queryFn: () => fetchAudioTracks({ id, language }),
        staleTime: 30_000,
      }),
    [queryClient, language],
  );
}

/**
 * Play a chapter, a book or anything else with recordings under it.
 * `fromId` starts at that verse instead of at the top.
 */
export function usePlayEntity() {
  const dispatch = useAudioQueueDispatch();
  const loadAudio = useEntityAudioLoader();

  return useCallback(
    async (
      id: string,
      mode: EntityPlayMode = "play",
      options: { fromId?: string } = {},
    ) => {
      let audio: EntityAudio;
      try {
        audio = await loadAudio(id);
      } catch {
        toast.error("Could not load the audio");
        return false;
      }
      const startsInside =
        !!options.fromId && audio.tracks.some((t) => t.id === options.fromId);
      const tracks = pickEntityTracks(audio, startsInside ? "parts" : mode);
      if (tracks.length === 0) {
        toast.error("No audio found here");
        return false;
      }
      const count = `${tracks.length} ${tracks.length === 1 ? "track" : "tracks"}`;
      if (mode === "next") {
        dispatch({ type: "playNext", tracks });
        toast.success(`${count} will play next`);
      } else if (mode === "enqueue") {
        dispatch({ type: "enqueue", tracks });
        toast.success(`${count} added to the queue`);
      } else {
        dispatch({
          type: "play",
          tracks,
          startIndex: startsInside
            ? tracks.findIndex((t) => t.id === options.fromId)
            : 0,
          source: { id, label: audio.label },
        });
      }
      return true;
    },
    [dispatch, loadAudio],
  );
}
