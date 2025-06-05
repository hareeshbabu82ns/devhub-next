import { useAudioPlayerContext } from "react-use-audio-player";
import { useCallback, useEffect, useRef } from "react";
import { usePlaylistAtom } from "@/hooks/use-songs";
import { Separator } from "../ui/separator";
import { cn } from "@/lib/utils";
import AudioPlayExtrasBar from "./AudioPlayExtrasBar";
import AudioControls from "./AudioControls";
// import PlaylistControls from "./PlaylistControls";
import { useReadLocalStorageHydrationSafe } from "@/hooks/use-hydration-safe-storage";
import { LS_AUDIO_PLAYER_VOLUME } from "@/lib/constants";

interface AudioPlayerProps {
  className?: string;
  isMini?: boolean;
  isSidebar?: boolean;
}

/**
 * Main audio player component that displays audio and playlist controls
 * with optional layout variants (mini, sidebar)
 */
const AudioPlayer = ({ className, isMini, isSidebar }: AudioPlayerProps) => {
  const { load, seek, src } = useAudioPlayerContext();
  const [playlist, dispatch] = usePlaylistAtom();
  const savedVolume =
    useReadLocalStorageHydrationSafe<number>(LS_AUDIO_PLAYER_VOLUME) || 1;

  // Track if user has requested to stop playback - persists between component renders
  const userPausedRef = useRef(false);

  // Effect to handle song loading with optimized dependencies
  useEffect(() => {
    // Only load a new song when necessary
    if (
      playlist.currentSongIndex >= 0 &&
      playlist.currentSongIndex < playlist.songs.length &&
      src !== playlist.songs[playlist.currentSongIndex].src
    ) {
      const currentSong = playlist.songs[playlist.currentSongIndex];
      const shouldAutoPlay = !userPausedRef.current;

      load(currentSong.src, {
        autoplay: shouldAutoPlay,
        initialVolume: savedVolume,
        loop: false, // Don't use native loop - we'll handle this in our code
        html5: playlist.stream,
        format: "mp3",
        onload: () => {
          // Seek to the saved position when loading
          if (currentSong.position > 0) {
            seek(currentSong.position);
          }
        },
        onend: handleTrackEnd,
      });
    }
  }, [playlist.currentSongIndex, src]); // Optimized dependency array

  // Centralized track end handler to handle song completion behavior
  const handleTrackEnd = useCallback(() => {
    const { repeat, songs, currentSongIndex } = playlist;

    // When a song ends
    if (repeat) {
      // For single track repeat, just replay
      if (songs.length === 1) {
        seek(0);
        return;
      }

      // Don't auto-proceed if user explicitly paused
      if (userPausedRef.current) {
        seek(0); // Reset to beginning but don't play
      } else {
        dispatch({ type: "NEXT_SONG" });
      }
    } else {
      dispatch({ type: "NEXT_SONG" });
    }
  }, [playlist, seek, dispatch]);

  // Don't render if no songs in playlist
  if (playlist.songs.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex gap-2 border bg-muted rounded-sm p-1",
        isMini ? "flex-row items-center" : "flex-col",
        className,
      )}
      role="region"
      aria-label="Audio player controls"
    >
      {/* Player Controls layout adapts based on props */}
      <div
        className={cn(
          "flex gap-2",
          isSidebar ? "flex-col" : "flex-row flex-wrap justify-center",
          isMini ? "items-center" : "",
        )}
      >
        {/* Audio Controls (play/pause, prev/next, seek) */}
        <AudioControls />

        {/* Separator with responsive orientation */}
        {!isSidebar && !isMini && (
          <Separator orientation="vertical" className="h-8" />
        )}
        {/* {isSidebar && <Separator className="my-1" />} */}

        {/* Playlist Controls (repeat, clear, playlist) - direct render without passing trigger prop */}
        {/* <PlaylistControls /> */}
      </div>

      {/* Extended Controls - hide in mini mode */}
      {!isMini && (
        <div className="flex flex-col flex-1 gap-2">
          <Separator />
          <AudioPlayExtrasBar isSidebar={isSidebar} />
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
