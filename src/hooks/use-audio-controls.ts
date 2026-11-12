import { useCallback } from "react";
import { useAudioPlayerContext } from "react-use-audio-player";
import { currentTrack, hasNext, hasPrev } from "@/lib/audio/queue";
import { useAudioQueue } from "./use-audio-queue";

/** "Previous" restarts the track once it is further in than this (seconds). */
const RESTART_AFTER = 3;

/**
 * Transport and queue controls shared by every player surface (top bar,
 * sidebar, phone bar, queue sheet), so they all behave the same.
 */
export function useAudioControls() {
  const { play, pause, getPosition, seek, duration, isPlaying, isLoading } =
    useAudioPlayerContext();
  const [queue, dispatch] = useAudioQueue();

  const current = currentTrack(queue);
  const hasSongs = queue.tracks.length > 0;

  const handlePlayPause = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  const handleNext = useCallback(() => dispatch({ type: "next" }), [dispatch]);

  const handlePrevious = useCallback(() => {
    // like any music player: first press goes back to the start of the track
    if (getPosition() > RESTART_AFTER) seek(0);
    else dispatch({ type: "prev" });
  }, [dispatch, getPosition, seek]);

  const handleSeekRelative = useCallback(
    (seconds: number) => {
      let position = getPosition() + seconds;
      if (duration && position > duration) position = duration;
      if (position < 0) position = 0;
      seek(position);
    },
    [getPosition, seek, duration],
  );

  const handleCycleRepeat = useCallback(
    () => dispatch({ type: "cycleRepeat" }),
    [dispatch],
  );

  const handleClearPlaylist = useCallback(
    () => dispatch({ type: "clear" }),
    [dispatch],
  );

  return {
    isPlaying,
    isLoading,
    current,
    index: queue.index,
    count: queue.tracks.length,
    source: queue.source,
    canGoNext: hasNext(queue),
    // going "back" inside a track is always possible
    canGoPrevious: hasSongs && (hasPrev(queue) || queue.index === 0),
    hasSongs,
    repeat: queue.repeat,

    handlePlayPause,
    handleNext,
    handlePrevious,
    handleSeekRelative,
    handleCycleRepeat,
    handleClearPlaylist,
  };
}
