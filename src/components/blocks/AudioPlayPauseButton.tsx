import {
  ChevronDown,
  ListEnd,
  ListPlus,
  ListVideo,
  PauseCircle as PauseIcon,
  PlayCircle as PlayIcon,
  Play,
} from "lucide-react";
import { useAudioPlayerContext } from "react-use-audio-player";
import {
  useAudioQueueDispatch,
  useCurrentTrack,
  usePlayEntity,
} from "@/hooks/use-audio-queue";
import { Track } from "@/lib/audio/queue";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import AudioControlButton from "../audio-player/AudioControlButton";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Spinner } from "../ui/spinner";

interface AudioPlayPauseButtonProps {
  track: Track;
  /**
   * The chapter (or other parent) this verse is listed under. Enables
   * "Play from here", which queues the rest of the chapter after it.
   */
  contextId?: string;
  /** Hide the menu with the queue options. */
  plain?: boolean;
  className?: string;
}

/**
 * Play / pause for one recording, e.g. a verse.
 *
 * The button plays just this track — or jumps to it when it is already in
 * the queue, so tapping a verse of the chapter that is playing moves the
 * playback there. The menu next to it has the other ways to play it.
 */
const AudioPlayPauseButton = ({
  track,
  contextId,
  plain,
  className,
}: AudioPlayPauseButtonProps) => {
  const dispatch = useAudioQueueDispatch();
  const current = useCurrentTrack();
  const playEntity = usePlayEntity();
  const { isPlaying, isLoading, play, pause } = useAudioPlayerContext();

  const isCurrent = current?.src === track.src;
  const isThisPlaying = isCurrent && isPlaying;

  const toggle = () => {
    if (isThisPlaying) pause();
    else if (isCurrent) play();
    else dispatch({ type: "playNow", track });
  };

  return (
    // the tile around it is clickable too
    <span
      className={cn("inline-flex items-center", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <AudioControlButton
        icon={
          isCurrent && isLoading ? (
            <Spinner className="size-5" />
          ) : isThisPlaying ? (
            <PauseIcon className="size-5" />
          ) : (
            <PlayIcon className="size-5" />
          )
        }
        label={isThisPlaying ? "Pause" : "Play"}
        title={isThisPlaying ? "Pause" : `Play ${track.title}`}
        onClick={toggle}
        isActive={isCurrent}
      />
      {!plain && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-ml-1 w-6 text-muted-foreground"
              aria-label="More ways to play"
              title="More ways to play"
            >
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {contextId && (
              <DropdownMenuItem
                onClick={() => playEntity(contextId, "parts", { fromId: track.id })}
              >
                <ListVideo /> Play from here
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => dispatch({ type: "play", tracks: [track] })}
            >
              <Play /> Play only this
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                dispatch({ type: "playNext", tracks: [track] });
                toast.success("Will play next");
              }}
            >
              <ListPlus /> Play next
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                dispatch({ type: "enqueue", tracks: [track] });
                toast.success("Added to the queue");
              }}
            >
              <ListEnd /> Add to queue
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </span>
  );
};

export default AudioPlayPauseButton;
