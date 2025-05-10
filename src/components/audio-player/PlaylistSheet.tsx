import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MdOutlineFeaturedPlayList as PlaylistIcon } from "react-icons/md";
import { usePlaylistAtom } from "@/hooks/use-songs";
import { Icons } from "../utils/icons";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import { useCallback } from "react";
import { useAudioPlayerContext } from "react-use-audio-player";
import { PlayCircle as PlayIcon, PauseCircle as PauseIcon } from "lucide-react";
import { usePlaylistSheet } from "@/hooks/use-playlist-sheet";
import PlaylistControls from "./PlaylistControls";
import AudioControls from "./AudioControls";
import AudioPlayExtrasBar from "./AudioPlayExtrasBar";

/**
 * A standalone sheet component for displaying the playlist
 * This component doesn't import any other audio player components to avoid circular dependencies
 */
export function PlaylistSheet() {
  const { isOpen, setIsOpen } = usePlaylistSheet();
  const [ playlist, dispatch ] = usePlaylistAtom();

  // Count active songs for badge
  const songCount = playlist.songs.length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        className="w-full max-w-md sm:max-w-lg p-0 flex flex-col h-dvh"
        side="right"
        onCloseAutoFocus={( e ) => {
          // Prevent focus events that might cause re-renders
          e.preventDefault();
        }}
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
          {/* Playlist controls */}
          <div className="flex items-center justify-center p-2 border rounded-md mx-4">
            <AudioControls />
            <Separator orientation="vertical" className="mx-2 h-6" />
            <PlaylistControls hideTrigger />
          </div>
          <div className="flex items-center px-4">
            <AudioPlayExtrasBar hideSongName />
          </div>

          {/* Simple playlist view without controls to avoid circular dependencies */}
          <Separator className="shrink-0 mt-4" />

          {/* Playlist content */}
          <ScrollArea className="flex-1 h-full w-full overflow-auto">
            <div className="p-4">
              {playlist.songs.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {playlist.songs.map( ( song, index ) => (
                    <PlaylistSongTile key={song.id || index} song={song} index={index} />
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

          <div className="p-4 mt-auto text-xs text-center text-muted-foreground">
            Your audio playlist
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Individual song tile for the playlist sheet
 */
function PlaylistSongTile( { song, index }: { song: Song; index: number } ) {
  const [ playlist, dispatch ] = usePlaylistAtom();
  const { isPlaying, play, pause, getPosition } = useAudioPlayerContext();

  const isActive = playlist.currentSongIndex === index;
  const isSongPlaying = isPlaying && isActive;

  // Extract filename from path for cleaner display
  const displayTitle =
    song.title || ( song.src ? song.src.split( "/" ).pop() : "Unknown" );

  // Handle play/pause for this specific song
  const handlePlayPause = useCallback( () => {
    if ( isActive ) {
      // If this is the current song, just toggle play/pause
      if ( isSongPlaying ) {
        pause();
        dispatch( { type: "PAUSE", payload: getPosition() } );
      } else {
        play();
      }
    } else {
      // If this is not the current song, set it as current
      dispatch( { type: "SET_CURRENT_INDEX", payload: index } );
    }
  }, [ dispatch, index, isActive, isSongPlaying, play, pause, getPosition ] );

  const handleRemove = useCallback( () => {
    dispatch( { type: "REMOVE_SONG", payload: index } );
  }, [ dispatch, index ] );

  return (
    <div
      className={`flex items-center gap-3 px-3 py-1 rounded-md transition-colors
        ${isActive
          ? "bg-secondary/20 border border-secondary"
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
        <p className="text-sm font-medium line-clamp-1 overflow-ellipsis">{displayTitle}</p>
        {song.artist && (
          <p className="text-xs text-muted-foreground line-clamp-1 overflow-ellipsis">
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
}