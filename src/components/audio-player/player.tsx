import { cn } from "@/lib/utils";
import { useAudioControls } from "@/hooks/use-audio-controls";
import { usePlaylistSheet } from "@/hooks/use-playlist-sheet";
import AudioControls from "./AudioControls";

interface AudioPlayerProps {
  className?: string;
}

/**
 * The now-playing strip of the top bar: the one place playback is controlled
 * from on every page and screen size. It sits in the bar's own row, so it
 * never covers page content. Tapping the title opens the queue, which has
 * the seek bar, speed, volume and the track list.
 *
 * Renders nothing while the queue is empty. Playback itself is done by
 * AudioEngine; this only shows state and dispatches.
 */
const AudioPlayer = ({ className }: AudioPlayerProps) => {
  const { current, index, count, hasSongs } = useAudioControls();
  const { setIsOpen } = usePlaylistSheet();

  if (!hasSongs) return null;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-1 rounded-md border bg-muted/60 pr-1 sm:max-w-md",
        className,
      )}
      role="region"
      aria-label="Audio player"
    >
      {/* previous / next need more room than a phone has next to the title */}
      <AudioControls compact className="hidden shrink-0 sm:flex" />
      <AudioControls
        compact
        className="shrink-0 sm:hidden [&>button:first-child]:hidden"
      />
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="min-w-0 flex-1 rounded-sm px-1 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Open the queue"
        aria-label={`Now playing: ${current?.title ?? "nothing"}. Open the queue`}
      >
        <span className="block truncate text-sm font-medium leading-tight">
          {current?.title ?? "Queue"}
        </span>
        <span className="block truncate text-xs leading-tight text-muted-foreground">
          {count > 1 ? `${index + 1} / ${count}` : ""}
          {count > 1 && current?.subtitle ? " · " : ""}
          {current?.subtitle ?? ""}
        </span>
      </button>
    </div>
  );
};

export default AudioPlayer;
