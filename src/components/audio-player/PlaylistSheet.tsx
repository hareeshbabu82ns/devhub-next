import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import Link from "next/link";
import { memo, useCallback, useEffect, useRef } from "react";
import { useAudioPlayerContext } from "react-use-audio-player";
import { MdOutlineFeaturedPlayList as PlaylistIcon } from "react-icons/md";
import {
  BookOpenText,
  PauseCircle as PauseIcon,
  PlayCircle as PlayIcon,
  X as RemoveIcon,
} from "lucide-react";
import { useAudioQueue } from "@/hooks/use-audio-queue";
import { usePlaylistSheet } from "@/hooks/use-playlist-sheet";
import { currentTrack, Track } from "@/lib/audio/queue";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import PlaylistControls from "./PlaylistControls";
import AudioControls from "./AudioControls";
import AudioPlayExtrasBar from "./AudioPlayExtrasBar";

/**
 * The queue: full transport controls on top, the list of tracks below.
 * Opened from the top bar on every page.
 */
export function PlaylistSheet() {
  const { isOpen, setIsOpen } = usePlaylistSheet();
  const [queue, dispatch] = useAudioQueue();
  const { isPlaying, play, pause } = useAudioPlayerContext();
  const current = currentTrack(queue);
  const songCount = queue.tracks.length;
  const listRef = useRef<HTMLDivElement>(null);

  // keep the playing track in view, also right after opening
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      listRef.current
        ?.querySelector('[data-current="true"]')
        ?.scrollIntoView({ block: "nearest" });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [isOpen, queue.index]);

  const playerRef = useRef({ isPlaying, play, pause });
  playerRef.current = { isPlaying, play, pause };

  const onRowPlay = useCallback(
    (index: number, isActive: boolean) => {
      if (!isActive) return dispatch({ type: "jump", index });
      const p = playerRef.current;
      if (p.isPlaying) p.pause();
      else p.play();
    },
    [dispatch],
  );
  const onRowRemove = useCallback(
    (index: number) =>
      dispatch({
        type: "remove",
        index,
        keepPlaying: playerRef.current.isPlaying,
      }),
    [dispatch],
  );
  const close = useCallback(() => setIsOpen(false), [setIsOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        className="w-full max-w-md sm:max-w-lg p-0 flex flex-col h-dvh gap-0"
        side="right"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="p-4 pb-2 shrink-0 text-left">
          <SheetTitle className="text-xl flex items-center gap-2 pr-8">
            <PlaylistIcon className="size-5 shrink-0" />
            Queue
            {songCount > 0 && (
              <Badge variant="outline">
                {songCount} {songCount === 1 ? "track" : "tracks"}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="truncate">
            {queue.source?.label
              ? `From ${queue.source.label}`
              : "What is playing and what comes next"}
          </SheetDescription>
        </SheetHeader>

        {songCount > 0 && (
          <div className="shrink-0 px-4 pb-3 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1" aria-live="polite">
                <p className="text-sm font-medium line-clamp-2">
                  {current?.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {songCount > 1 ? `${queue.index + 1} / ${songCount}` : ""}
                  {songCount > 1 && current?.subtitle ? " · " : ""}
                  {current?.subtitle}
                </p>
              </div>
              {current?.href && (
                <Button variant="outline" size="sm" asChild onClick={close}>
                  <Link href={current.href}>
                    <BookOpenText className="size-4" />
                    Text
                  </Link>
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-2 rounded-md border p-1">
              <AudioControls />
              <Separator
                orientation="vertical"
                className="h-6 hidden min-[380px]:block"
              />
              <PlaylistControls />
            </div>
            <AudioPlayExtrasBar hideSongName />
          </div>
        )}

        <Separator className="shrink-0" />

        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-4">
          {songCount > 0 ? (
            <ol className="flex flex-col gap-1">
              {queue.tracks.map((track, index) => (
                <QueueRow
                  key={track.src}
                  track={track}
                  index={index}
                  isActive={index === queue.index}
                  isPlaying={isPlaying && index === queue.index}
                  onPlay={onRowPlay}
                  onRemove={onRowRemove}
                />
              ))}
            </ol>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
              <PlaylistIcon className="size-12" />
              <p className="mt-2">Nothing in the queue</p>
              <p className="text-sm mt-1 max-w-xs">
                Use the play button on a verse, a chapter or a book to start
                listening.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const QueueRow = memo(function QueueRow({
  track,
  index,
  isActive,
  isPlaying,
  onPlay,
  onRemove,
}: {
  track: Track;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: (index: number, isActive: boolean) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <li
      data-current={isActive}
      className={cn(
        "flex items-center gap-1 rounded-md border border-transparent pr-1 transition-colors",
        isActive ? "bg-secondary/20 border-secondary" : "hover:bg-muted/60",
      )}
    >
      <button
        type="button"
        onClick={() => onPlay(index, isActive)}
        aria-label={`${isPlaying ? "Pause" : "Play"} ${track.title}`}
        aria-current={isActive ? "true" : undefined}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={cn(
            "flex w-7 shrink-0 justify-center text-xs tabular-nums text-muted-foreground",
            isActive && "text-primary",
          )}
        >
          {isPlaying ? (
            <PauseIcon className="size-5" />
          ) : isActive ? (
            <PlayIcon className="size-5" />
          ) : (
            index + 1
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {track.title}
          </span>
          {track.subtitle && (
            <span className="block truncate text-xs text-muted-foreground">
              {track.subtitle}
            </span>
          )}
        </span>
      </button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(index)}
        aria-label={`Remove ${track.title} from the queue`}
        title="Remove from the queue"
        className="size-9 shrink-0 opacity-70 hover:opacity-100"
      >
        <RemoveIcon className="size-4" />
      </Button>
    </li>
  );
});
