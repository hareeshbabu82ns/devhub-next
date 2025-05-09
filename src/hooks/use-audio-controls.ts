import { useCallback } from "react";
import { useAudioPlayerContext } from "react-use-audio-player";
import { usePlaylistAtom } from "./use-songs";

/**
 * Custom hook providing unified audio controls that can be shared across components
 * This centralizes audio logic to prevent duplicate implementations
 */
export function useAudioControls() {
  const { play, pause, getPosition, seek, duration, isPlaying } =
    useAudioPlayerContext();

  const [playlist, dispatch] = usePlaylistAtom();

  // Derived states for player logic
  const canGoNext =
    playlist.songs.length > 0 &&
    playlist.currentSongIndex !== -1 &&
    playlist.currentSongIndex < playlist.songs.length - 1;

  const canGoPrevious =
    playlist.songs.length > 0 &&
    playlist.currentSongIndex !== -1 &&
    playlist.currentSongIndex > 0;

  const hasSongs = playlist.songs.length > 0;

  // Handler for playing or pausing the current song
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
      dispatch({ type: "PAUSE", payload: getPosition() });
    } else {
      play();
    }
  }, [isPlaying, pause, play, dispatch, getPosition]);

  // Handler for skipping to the next song
  const handleNext = useCallback(() => {
    dispatch({ type: "NEXT_SONG" });
  }, [dispatch]);

  // Handler for going to the previous song
  const handlePrevious = useCallback(() => {
    dispatch({ type: "PREV_SONG" });
  }, [dispatch]);

  // Handler for seeking forward or backward
  const handleSeek = useCallback(
    (direction: "forward" | "backward") => {
      const currentPosition = getPosition();
      const seekAmount = playlist.seekInterval || 10;

      // Calculate new position based on direction with bounds checking
      let newPosition;
      if (direction === "forward") {
        newPosition = Math.min(
          duration || Infinity,
          currentPosition + seekAmount,
        );
      } else {
        newPosition = Math.max(0, currentPosition - seekAmount);
      }

      seek(newPosition);
    },
    [getPosition, seek, playlist.seekInterval, duration],
  );

  // Handler for seeking forward relatively by payload amount
  const handleSeekRelative = useCallback(
    (seconds: number) => {
      const currentPosition = getPosition();
      let newPosition = currentPosition + seconds;

      // Apply bounds checking
      if (duration && newPosition > duration) {
        newPosition = duration;
      }
      if (newPosition < 0) {
        newPosition = 0;
      }

      seek(newPosition);
      dispatch({ type: "SEEK_RELATIVE", payload: seconds });
    },
    [getPosition, seek, dispatch, duration],
  );

  // Handler for toggling repeat mode
  const handleToggleRepeat = useCallback(() => {
    dispatch({ type: "TOGGLE_REPEAT" });
  }, [dispatch]);

  // Handler for clearing the playlist
  const handleClearPlaylist = useCallback(() => {
    pause();
    dispatch({ type: "CLEAR_PLAYLIST" });
  }, [dispatch, pause]);

  return {
    // Player state
    isPlaying,
    canGoNext,
    canGoPrevious,
    hasSongs,
    repeat: playlist.repeat,

    // Actions
    handlePlayPause,
    handleNext,
    handlePrevious,
    handleSeek,
    handleSeekRelative,
    handleToggleRepeat,
    handleClearPlaylist,
  };
}
