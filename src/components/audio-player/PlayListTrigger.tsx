import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  MdOutlineFeaturedPlayList as PlaylistIcon,
  MdOutlinePlayCircle as PlayIcon,
  MdOutlinePauseCircle as PauseIcon,
  MdSkipPrevious,
  MdSkipNext,
  MdOutlineFastRewind,
  MdOutlineFastForward,
  MdOutlineRepeat,
  MdOutlineRepeatOn,
  MdOutlinePauseCircle,
  MdOutlinePlayCircle,
  MdOutlinePlaylistRemove as ClearIcon,
} from "react-icons/md";
import { usePlaylistAtom } from "@/hooks/use-songs";
import { Icons } from "../utils/icons";
import { useAudioPlayerContext } from "react-use-audio-player";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { useCallback } from "react";

// Import player controls instead of full player to avoid re-initialization
import AudioPlayExtrasBar from "./AudioPlayExtrasBar";

export default function PlayListTrigger( { className }: { className?: string } ) {
  const [ playlist ] = usePlaylistAtom();

  // Count active songs for badge
  const songCount = playlist.songs.length;

  return (
    <Sheet>
      <SheetTrigger asChild className={className}>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Open playlist (${songCount} songs)`}
          className="relative"
        >
          <PlaylistIcon className="size-5" />
          {songCount > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-1 -right-1 min-w-5 flex items-center justify-center text-xs p-0"
            >
              {songCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        className="w-full max-w-md sm:max-w-lg p-0 flex flex-col h-dvh"
        side="right"
      >
        <SheetHeader className="p-4 pb-0 shrink-0">
          <div className="flex justify-between items-center">
            <SheetTitle className="text-xl flex items-center gap-2">
              <PlaylistIcon className="size-5" />
              Playlist
              {songCount > 0 && (
                <Badge variant="outline">{songCount} tracks</Badge>
              )}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Player controls at top - using play controls instead of full player */}
          <div className="p-4 pb-2 shrink-0">
            {/* Simplified player controls that don't reinitialize audio */}
            <PlaylistPlayerControls />
          </div>

          <Separator className="shrink-0" />

          {/* Playlist content */}
          <ScrollArea className="flex-1 h-full w-full overflow-auto">
            <div className="p-4">
              {playlist.songs.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {playlist.songs.map( ( song, index ) => (
                    <SongTile key={song.id || index} song={song} index={index} />
                  ) )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <PlaylistIcon className="size-12" />
                  <p className="mt-2">Your playlist is empty</p>
                  <p className="text-sm mt-1">Add songs to get started</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// New component for playlist player controls that delegates to the main player via state
function PlaylistPlayerControls() {
  const [ playlist, dispatch ] = usePlaylistAtom();
  const {
    isPlaying,
    play,
    pause,
    getPosition
  } = useAudioPlayerContext();

  // Only render if we have songs
  if ( playlist.songs.length === 0 ) {
    return null;
  }

  // Determine if we can go to previous/next track
  const canGoNext =
    playlist.songs.length > 0 &&
    playlist.currentSongIndex !== -1 &&
    playlist.currentSongIndex < playlist.songs.length - 1;

  const canGoPrevious =
    playlist.songs.length > 0 &&
    playlist.currentSongIndex !== -1 &&
    playlist.currentSongIndex > 0;

  // Handle play/pause toggle - this needs to use the audio context directly
  const handlePlayPause = () => {
    if ( isPlaying ) {
      pause();
      dispatch( { type: "PAUSE", payload: getPosition() } );
    } else {
      play();
      // No need to dispatch PLAY action as the main player component 
      // will handle state updates when audio is playing
    }
  };

  // We don't call the audio context methods directly anymore
  // Instead, we dispatch actions that will be handled by the main player component
  return (
    <div className="flex flex-col gap-2 border bg-muted rounded-sm p-1">
      <div className="flex gap-2 flex-row flex-wrap justify-center">
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
            <MdSkipPrevious className="size-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Rewind"
            onClick={() => dispatch( { type: "SEEK_RELATIVE", payload: -10 } )}
            disabled={!isPlaying}
            className="focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <MdOutlineFastRewind className="size-5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={isPlaying ? "Pause" : "Play"}
            disabled={playlist.songs.length === 0}
            onClick={handlePlayPause}
            className="focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            {isPlaying ? (
              <MdOutlinePauseCircle className="size-5" />
            ) : (
              <MdOutlinePlayCircle className="size-5" />
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Fast forward"
            onClick={() => dispatch( { type: "SEEK_RELATIVE", payload: 10 } )}
            disabled={!isPlaying}
            className="focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <MdOutlineFastForward className="size-5" />
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
            <MdSkipNext className="size-5" />
          </Button>
        </div>

        {/* Repeat control */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={playlist.repeat ? "Turn repeat off" : "Turn repeat on"}
            aria-pressed={playlist.repeat}
            title={playlist.repeat ? "Repeat off" : "Repeat on"}
            disabled={playlist.songs.length === 0}
            onClick={() => dispatch( { type: "TOGGLE_REPEAT" } )}
            className="focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            {playlist.repeat ? (
              <MdOutlineRepeatOn className="size-5" />
            ) : (
              <MdOutlineRepeat className="size-5" />
            )}
          </Button>

          {/* Clear Playlist control */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Clear playlist"
            title="Clear playlist"
            disabled={playlist.songs.length === 0}
            onClick={() => {
              pause(); // Directly pause the audio
              // dispatch( { type: "PAUSE", payload: getPosition() } );
              dispatch( { type: "CLEAR_PLAYLIST" } );
            }}
            className="focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <ClearIcon className="size-5" />
          </Button>
        </div>
      </div>

      <Separator />
      <AudioPlayExtrasBar />
    </div>
  );
}

const SongTile = ( { song, index }: { song: Song; index: number } ) => {
  const [ playlist, dispatch ] = usePlaylistAtom();
  const { isPlaying, play, pause, getPosition } = useAudioPlayerContext();
  const isActive = playlist.currentSongIndex === index;
  const isSongPlaying = isPlaying && isActive;

  // Extract filename from path for cleaner display
  const displayTitle =
    song.title || ( song.src ? song.src.split( "/" ).pop() : "Unknown" );

  // Use the playlist dispatch to control playback instead of directly calling audioPlayerContext
  const handlePlayPause = useCallback( () => {
    if ( isActive ) {
      // If this is the current song, just toggle play/pause
      if ( isSongPlaying ) {
        pause();
        dispatch( { type: "PAUSE", payload: getPosition() } );
      } else {
        play();
        // No need to dispatch PLAY action as the main player component handles this
      }
    } else {
      // If this is not the current song, set it as current and play
      dispatch( { type: "SET_CURRENT_INDEX", payload: index } );
      // This will trigger a song change in the main player which will handle playback
    }
  }, [ dispatch, index, isActive, isSongPlaying, play, pause, getPosition ] );

  const handleRemove = useCallback( () => {
    dispatch( { type: "REMOVE_SONG", payload: index } );
  }, [ dispatch, index ] );

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-md transition-colors
        ${isActive
          ? "bg-secondary/40 border border-secondary"
          : "hover:bg-muted/60"}`}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePlayPause}
        aria-label={isSongPlaying ? "Pause" : "Play"}
        className="shrink-0"
      >
        {isSongPlaying ? (
          <PauseIcon className="size-5" />
        ) : (
          <PlayIcon className="size-5" />
        )}
      </Button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayTitle}</p>
        {song.artist && (
          <p className="text-xs text-muted-foreground truncate">
            {song.artist}
          </p>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleRemove}
        aria-label="Remove from playlist"
        className="shrink-0 opacity-70 hover:opacity-100"
      >
        <Icons.close className="size-4" />
      </Button>
    </div>
  );
};
