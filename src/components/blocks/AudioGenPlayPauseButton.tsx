import { PlayCircle as PlayIcon, PauseCircle as PauseIcon } from "lucide-react";
import { useAudioPlayerContext } from "react-use-audio-player";
import { usePlaylistAtom } from "@/hooks/use-songs";
import { toast } from "sonner";
import { forwardRef, useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import AudioControlButton from "../audio-player/AudioControlButton";
import { generateAudioForEntity } from "@/app/(app)/entities/actions";

interface AudioGenPlayPauseButtonProps {
  id: string;
  title: string;
  className?: string;
}

/**
 * A button component for generating audio and playing/pausing individual audio tracks
 * Can be placed anywhere in the app to play a specific audio file
 */
const AudioGenPlayPauseButton = forwardRef<
  HTMLButtonElement,
  AudioGenPlayPauseButtonProps
>(({ title, id, className }, ref) => {
  const [playlist, dispatch] = usePlaylistAtom();
  const {
    isPlaying,
    play: playerPlay,
    pause: playerPause,
    getPosition,
  } = useAudioPlayerContext();

  // Check if this is the currently playing track
  const isCurrentlyPlaying = isPlaying && playlist.currentSongIndex !== -1;

  // Audio generation mutation
  const generateAudioMutation = useMutation({
    mutationFn: async () => {
      const audioPath = await generateAudioForEntity(id);
      if (!audioPath) {
        throw new Error("Failed to generate audio");
      }
      return audioPath;
    },
    onSuccess: (audioPath) => {
      toast.success("Audio generated successfully");

      // Automatically add to playlist and start playing
      dispatch({
        type: "ADD_SONG",
        payload: {
          id,
          title: title || audioPath.split("/").pop() || "Unknown",
          album: "",
          artist: "",
          src: audioPath,
          position: 0,
        },
      });
    },
    onError: (error) => {
      console.error("Audio generation failed:", error);
      toast.error("Failed to generate audio");
    },
  });

  // Add/play song in playlist
  const play = useCallback(async () => {
    // If no audio URL exists, generate audio first
    if (generateAudioMutation.isPending) {
      toast.info("Audio generation in progress...");
      return;
    }

    try {
      await generateAudioMutation.mutateAsync();
      // After successful generation, the audio will be played via the success handler
      return;
    } catch (error) {
      // Error is already handled in the mutation's onError
      return;
    }
  }, [
    generateAudioMutation,
    playlist.songs,
    playlist.currentSongIndex,
    id,
    title,
    dispatch,
  ]);

  // Pause playback
  const pause = useCallback(() => {
    playerPause();
    dispatch({ type: "PAUSE", payload: getPosition() });
  }, [playerPause, dispatch, getPosition]);

  return (
    <AudioControlButton
      ref={ref}
      icon={
        generateAudioMutation.isPending ? (
          <div className="size-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        ) : isCurrentlyPlaying ? (
          <PauseIcon className="size-5" />
        ) : (
          <PlayIcon className="size-5" />
        )
      }
      label={
        generateAudioMutation.isPending
          ? "Generating audio..."
          : isCurrentlyPlaying
            ? "Pause"
            : "Play"
      }
      title={title}
      onClick={isCurrentlyPlaying ? pause : play}
      className={className}
      // isActive={Boolean(
      //   currentAudioUrl &&
      //     playlist.songs[playlist.currentSongIndex]?.src === currentAudioUrl,
      // )}
      disabled={generateAudioMutation.isPending}
    />
  );
});

AudioGenPlayPauseButton.displayName = "AudioGenPlayPauseButton";

export default AudioGenPlayPauseButton;
