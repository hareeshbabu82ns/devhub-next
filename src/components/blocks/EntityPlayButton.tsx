import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  Disc3,
  ListEnd,
  ListOrdered,
  ListPlus,
  Play,
} from "lucide-react";
import {
  EntityPlayMode,
  useEntityAudioLoader,
  usePlayEntity,
} from "@/hooks/use-audio-queue";
import { useLanguageAtomValue } from "@/hooks/use-config";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Spinner } from "../ui/spinner";

/**
 * Play everything under an entity — the verses of a chapter, or every
 * chapter of a book — in reading order. The main button replaces the queue
 * and starts; the menu adds to the queue instead.
 */
export default function EntityPlayButton({
  entityId,
  label = "this",
}: {
  entityId: string;
  /** What is being played, for the tooltips: "chapter", "book"… */
  label?: string;
}) {
  const playEntity = usePlayEntity();
  const loadAudio = useEntityAudioLoader();
  const language = useLanguageAtomValue();
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // only looked up once the menu is opened, to show what there is to play
  const { data: audio, isFetching } = useQuery({
    queryKey: ["entityAudioMenu", entityId, language],
    queryFn: () => loadAudio(entityId),
    enabled: menuOpen,
    staleTime: 0,
    gcTime: 0,
  });

  const run = async (mode: EntityPlayMode) => {
    setBusy(true);
    try {
      await playEntity(entityId, mode);
    } finally {
      setBusy(false);
    }
  };

  const hasBoth = !!audio?.own && audio.tracks.length > 0;
  const nothing = !!audio && !audio.own && audio.tracks.length === 0;

  return (
    <div className="flex">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="rounded-r-none"
        disabled={busy}
        onClick={() => run("play")}
        title={`Play ${label}`}
        aria-label={`Play ${label}`}
      >
        {busy ? <Spinner className="size-4" /> : <Play className="size-4" />}
      </Button>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="-ml-px w-7 rounded-l-none"
            aria-label="More ways to play"
            title="More ways to play"
          >
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="flex items-center gap-2 font-normal text-muted-foreground">
            {isFetching && !audio ? (
              <>
                <Spinner className="size-3" /> Looking for audio…
              </>
            ) : nothing ? (
              "No audio here yet"
            ) : audio ? (
              `${audio.tracks.length} ${audio.tracks.length === 1 ? "track" : "tracks"}${audio.own ? " + full recording" : ""}`
            ) : (
              "Audio"
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {hasBoth ? (
            <>
              <DropdownMenuItem onClick={() => run("play")}>
                <Disc3 /> Play the full recording
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => run("parts")}>
                <ListOrdered /> Play part by part
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem disabled={nothing} onClick={() => run("play")}>
              <Play /> Play all
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={nothing} onClick={() => run("next")}>
            <ListPlus /> Play next
          </DropdownMenuItem>
          <DropdownMenuItem disabled={nothing} onClick={() => run("enqueue")}>
            <ListEnd /> Add to queue
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
