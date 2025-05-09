import { useAudioPlayerContext } from "react-use-audio-player";
import { useCallback, useEffect, useRef } from "react";
import { usePlaylistAtom } from "@/hooks/use-songs";
import { Button } from "../ui/button";
import {
  MdSkipPrevious as PrevIcon,
  MdSkipNext as NextIcon,
  MdOutlineFastForward as ForwardIcon,
  MdOutlineFastRewind as RewindIcon,
  MdOutlinePlayCircle as PlayIcon,
  MdOutlinePauseCircle as PauseIcon,
  MdOutlineRepeat as RepeatIcon,
  MdOutlineRepeatOn as RepeatOnIcon,
  MdOutlinePlaylistRemove as ClearIcon,
} from "react-icons/md";
import { Separator } from "../ui/separator";
import PlayListTrigger from "./PlayListTrigger";
import { cn } from "@/lib/utils";
import AudioPlayExtrasBar from "./AudioPlayExtrasBar";

interface AudioPlayerProps {
  className?: string;
  isMini?: boolean;
  isSidebar?: boolean;
}

const AudioPlayer = ( { className, isMini, isSidebar }: AudioPlayerProps ) => {
  const { load, isPlaying: playing, stop, play, pause, seek, src, getPosition, duration } =
    useAudioPlayerContext();
  const [ playlist, dispatch ] = usePlaylistAtom();

  // Track if user has requested to stop playback
  const userPausedRef = useRef( false );

  // Track the last SEEK_RELATIVE action to avoid duplicate handling
  const lastSeekRelativeActionRef = useRef<number | null>( null );

  // Handle play/pause toggle with memoized callback to prevent re-renders
  const handlePlayPause = useCallback( () => {
    if ( playing ) {
      userPausedRef.current = true; // Mark that user explicitly paused
      pause();
      dispatch( { type: "PAUSE", payload: getPosition() } );
    } else {
      userPausedRef.current = false; // Reset when user plays
      play();
    }
  }, [ playing, pause, dispatch, getPosition, play ] );

  // Fixed: Handle seeking with proper position calculation and boundary checks
  const handleSeek = useCallback( ( direction: "forward" | "backward" ) => {
    const currentPosition = getPosition();
    const seekAmount = playlist.seekInterval || 10; // Default to 10 seconds if not set

    // Calculate new position based on direction
    let newPosition;
    if ( direction === "forward" ) {
      newPosition = currentPosition + seekAmount;
      // Make sure we don't seek beyond the end
      if ( duration && newPosition > duration ) {
        newPosition = duration;
      }
    } else { // backward
      newPosition = currentPosition - seekAmount;
      // Make sure we don't go below zero
      if ( newPosition < 0 ) {
        newPosition = 0;
      }
    }

    // Apply the seek operation
    seek( newPosition );
  }, [ getPosition, seek, playlist.seekInterval, duration ] );

  // Effect to handle SEEK_RELATIVE actions from any component
  useEffect( () => {
    // If the action type is "SEEK_RELATIVE" and we have valid audio loaded
    const actionType = ( playlist as any )._action?.type;
    const payload = ( playlist as any )._action?.payload;

    if ( actionType === "SEEK_RELATIVE" && typeof payload === 'number' && playing ) {
      // Prevent duplicate handling with a timestamp reference
      const now = Date.now();
      if ( lastSeekRelativeActionRef.current && now - lastSeekRelativeActionRef.current < 100 ) {
        return;
      }

      lastSeekRelativeActionRef.current = now;

      const currentPosition = getPosition();
      let newPosition = currentPosition + payload;

      // Apply bounds checking
      if ( duration && newPosition > duration ) {
        newPosition = duration;
      }
      if ( newPosition < 0 ) {
        newPosition = 0;
      }

      // Perform the actual seek
      seek( newPosition );
    }
  }, [ playlist, seek, getPosition, duration, playing ] );

  // Effect to handle song loading
  useEffect( () => {
    if (
      playlist.currentSongIndex >= 0 &&
      playlist.currentSongIndex < playlist.songs.length &&
      src !== playlist.songs[ playlist.currentSongIndex ].src
    ) {
      // Don't autoplay if user explicitly paused
      const shouldAutoPlay = !userPausedRef.current;

      load( playlist.songs[ playlist.currentSongIndex ].src, {
        autoplay: shouldAutoPlay,
        // Don't set loop property based on repeat state - we'll handle this ourselves
        loop: false,
        html5: playlist.stream,
        format: "mp3",
        onload: () => {
          seek( playlist.songs[ playlist.currentSongIndex ].position );
        },
        onend: () => {
          // Handle end of track behavior
          if ( playlist.repeat ) {
            // If there's only one song and repeat is enabled, replay the same song
            if ( playlist.songs.length === 1 ) {
              seek( 0 );
              play();
              return;
            }

            // If repeat is enabled but user paused, don't auto proceed to next song
            if ( userPausedRef.current ) {
              // Seek to beginning but don't play
              seek( 0 );
            } else {
              // Otherwise handle next song logic
              dispatch( { type: "NEXT_SONG" } );
            }
          } else {
            dispatch( { type: "NEXT_SONG" } );
          }
        },
      } );
    }
  }, [ playlist.currentSongIndex, load, playlist.stream, src, seek, dispatch, playlist.songs, play ] );

  // Handle toggling repeat - simplified to not interrupt playback
  const handleToggleRepeat = useCallback( () => {
    dispatch( { type: "TOGGLE_REPEAT" } );
  }, [ dispatch ] );

  // Don't render if no songs in playlist
  if ( playlist.songs.length === 0 ) {
    return null;
  }

  // Determine if we can go to previous/next track
  const canGoNext = playlist.songs.length > 0 &&
    playlist.currentSongIndex !== -1 &&
    playlist.currentSongIndex < playlist.songs.length - 1;

  const canGoPrevious = playlist.songs.length > 0 &&
    playlist.currentSongIndex !== -1 &&
    playlist.currentSongIndex > 0;

  return (
    <div
      className={cn(
        "flex gap-2 border bg-muted rounded-sm p-1",
        isMini ? "flex-row items-center" : "flex-col",
        className
      )}
      role="region"
      aria-label="Audio player controls"
    >
      {/* Player Controls */}
      <div
        className={cn(
          "flex gap-2",
          isSidebar ? "flex-col" : "flex-row flex-wrap justify-center",
          isMini ? "items-center" : ""
        )}
      >
        {/* Transport Controls Group */}
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Playback controls"
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Previous track"
            onClick={() => dispatch( { type: "PREV_SONG" } )}
            disabled={!canGoPrevious}
            className="focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <PrevIcon className="size-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Rewind"
            onClick={() => dispatch( { type: "SEEK_RELATIVE", payload: -playlist.seekInterval } )}
            disabled={!playing}
            className="focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <RewindIcon className="size-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={playing ? "Pause" : "Play"}
            disabled={playlist.songs.length === 0}
            onClick={handlePlayPause}
            className="focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            {playing ? (
              <PauseIcon className="size-5" />
            ) : (
              <PlayIcon className="size-5" />
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Fast forward"
            onClick={() => dispatch( { type: "SEEK_RELATIVE", payload: playlist.seekInterval } )}
            disabled={!playing}
            className="focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <ForwardIcon className="size-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Next track"
            onClick={() => dispatch( { type: "NEXT_SONG" } )}
            disabled={!canGoNext}
            className="focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <NextIcon className="size-5" />
          </Button>
        </div>

        {/* Separator - hide in sidebar mode or show vertical in regular mode */}
        {!isSidebar && !isMini && <Separator orientation="vertical" className="h-8" />}
        {isSidebar && <Separator className="my-1" />}

        {/* Playlist Controls Group */}
        <div
          className="flex items-center justify-around gap-1"
          role="group"
          aria-label="Playlist controls"
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={playlist.repeat ? "Turn repeat off" : "Turn repeat on"}
            aria-pressed={playlist.repeat}
            title={playlist.repeat ? "Repeat off" : "Repeat on"}
            disabled={playlist.songs.length === 0}
            onClick={handleToggleRepeat}
            className="focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            {playlist.repeat ? (
              <RepeatOnIcon className="size-5" />
            ) : (
              <RepeatIcon className="size-5" />
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Clear playlist"
            title="Clear playlist"
            disabled={playlist.songs.length === 0}
            onClick={() => {
              userPausedRef.current = true; // Ensure playback stops
              pause();
              dispatch( { type: "CLEAR_PLAYLIST" } );
            }}
            className="focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <ClearIcon className="size-5" />
          </Button>

          {/* Playlist trigger button */}
          <PlayListTrigger />
        </div>
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
