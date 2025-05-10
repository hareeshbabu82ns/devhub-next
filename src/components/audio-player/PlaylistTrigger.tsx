import { Button } from "@/components/ui/button";
import { MdOutlineFeaturedPlayList as PlaylistIcon } from "react-icons/md";
import { usePlaylistAtom } from "@/hooks/use-songs";
import { Badge } from "../ui/badge";
import { usePlaylistSheet } from "@/hooks/use-playlist-sheet";

/**
 * A simple button component that triggers the playlist sheet
 * This component doesn't import anything from the audio player components
 * to prevent circular dependencies
 */
export function PlaylistTrigger( { className }: { className?: string } ) {
  const [ playlist ] = usePlaylistAtom();
  const { setIsOpen } = usePlaylistSheet();

  // Count active songs for badge
  const songCount = playlist.songs.length;

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={`Open playlist (${songCount} songs)`}
      className={`relative ${className}`}
      onClick={() => setIsOpen( true )}
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
  );
}