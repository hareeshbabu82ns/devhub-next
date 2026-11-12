import { Button } from "@/components/ui/button";
import { MdOutlineFeaturedPlayList as PlaylistIcon } from "react-icons/md";
import { useAudioPlayerContext } from "react-use-audio-player";
import { useAudioQueueSize } from "@/hooks/use-audio-queue";
import { Badge } from "../ui/badge";
import { usePlaylistSheet } from "@/hooks/use-playlist-sheet";
import { cn } from "@/lib/utils";

/** Top-bar button that opens the queue; always there, even when it is empty. */
export function PlaylistTrigger({ className }: { className?: string }) {
  const songCount = useAudioQueueSize();
  const { isPlaying } = useAudioPlayerContext();
  const { setIsOpen } = usePlaylistSheet();

  return (
    <Button
      variant="outline"
      size="icon"
      title="Queue"
      aria-label={`Open the queue (${songCount} tracks)`}
      className={cn(
        "relative min-h-9 min-w-9 sm:h-10 sm:w-10 touch-manipulation",
        isPlaying && "text-primary border-primary/50",
        className,
      )}
      onClick={() => setIsOpen(true)}
    >
      <PlaylistIcon className="size-4 sm:size-5" />
      {songCount > 0 && (
        <Badge
          variant="secondary"
          className="absolute -top-1 -right-1 min-w-4 h-4 sm:min-w-5 sm:h-5 flex items-center justify-center text-[10px] sm:text-xs p-0 px-1"
        >
          {songCount > 999 ? "999+" : songCount}
        </Badge>
      )}
    </Button>
  );
}
