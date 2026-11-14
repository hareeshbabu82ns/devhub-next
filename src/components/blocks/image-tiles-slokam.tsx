import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  ENTITY_DEFAULT_IMAGE_THUMBNAIL,
  LANGUAGE_FONT_FAMILY,
} from "@/lib/constants";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCopyToClipboard } from "usehooks-ts";
import AudioPlayPauseButton from "./AudioPlayPauseButton";
import OptimizedImage from "../utils/optimized-image";
// import SlokamDisplayDlgTrigger from "./SlokamDisplayDlgTrigger";
import { Icons } from "../utils/icons";
import { TileModel } from "@/types/entities";
import { toast } from "sonner";
import { useLanguageAtomValue, useTextSizeAtomValue } from "@/hooks/use-config";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useParams, useRouter } from "next/navigation";
import AudioGenPlayPauseButton from "./AudioGenPlayPauseButton";
import { useEffect, useRef, useState } from "react";
import { useAudioPlayerContext } from "react-use-audio-player";
import {
  useAudioQueueDispatch,
  useCurrentTrack,
  usePlayEntity,
} from "@/hooks/use-audio-queue";
import {
  AudioLines,
  ListEnd,
  ListPlus,
  ListVideo,
  MoreHorizontal,
  Play,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import GenerateAudioDialog from "./GenerateAudioDialog";
import DeleteAudioDialog from "./DeleteAudioDialog";
import { Track, trackTitle } from "@/lib/audio/queue";

interface ArtSlokamTileProps extends React.HTMLAttributes<HTMLDivElement> {
  index?: number;
  model: TileModel;
  onTileClicked?: (entity: TileModel) => void;
  onDeleteClicked?: (entity: TileModel) => void;
  onEditClicked?: (model: TileModel) => void;
  onBookmarkClicked?: (model: TileModel) => void;
}

export const ArtSlokamTile = ({
  index = 0,
  model,
  className,
  onEditClicked,
  onDeleteClicked,
  onTileClicked,
  onBookmarkClicked,
}: ArtSlokamTileProps) => {
  const router = useRouter();
  const params = useParams();
  const { entityId } = params as { entityId: string };
  const textSize = useTextSizeAtomValue();
  const language = useLanguageAtomValue();
  const [, copyToClipboard] = useCopyToClipboard();
  const isTouchDevice = useMediaQuery("(pointer: coarse)");
  const dispatch = useAudioQueueDispatch();
  const playEntity = usePlayEntity();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [audioDialogOpen, setAudioDialogOpen] = useState(false);
  const [confirmDeleteAudio, setConfirmDeleteAudio] = useState(false);

  const number = (model.order ? model.order + 1 : index)
    .toString()
    .padStart(3, "0");
  const track: Track = {
    id: model.id,
    src: model.audio || "",
    title: trackTitle(model.title, `Verse ${number}`),
    subtitle: [model.parentTitle, number].filter(Boolean).join(" · "),
    href: entityId ? `/entities/${entityId}/child/${model.id}` : undefined,
  };

  // the verse being recited is marked and, while playing, kept in view
  const nowPlaying = useCurrentTrack();
  const { isPlaying } = useAudioPlayerContext();
  const isCurrent = !!model.audio && nowPlaying?.src === model.audio;
  const tileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isCurrent && isPlaying) {
      tileRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    // only when the playing verse changes, not on every pause / resume
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrent]);

  return (
    <div
      ref={tileRef}
      aria-current={isCurrent ? "true" : undefined}
      className={cn(
        LANGUAGE_FONT_FAMILY[language as keyof typeof LANGUAGE_FONT_FAMILY],
        "group rounded-xl p-4 border dark:highlight-white/5 hover:bg-secondary/10 space-y-2 flex flex-row space-x-4",
        onTileClicked ? "cursor-pointer" : "",
        model.bookmarked ? "border-success/50" : "",
        isCurrent && "border-primary bg-primary/5 scroll-my-20",
        className,
      )}
      onClick={(e) => {
        if (onTileClicked) {
          e.stopPropagation();
          onTileClicked(model);
        }
      }}
    >
      {model.src && model.src !== ENTITY_DEFAULT_IMAGE_THUMBNAIL && (
        <div className="aspect-9/11 w-37.5 rounded-md transform overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
          <OptimizedImage
            alt={model.title}
            loading="lazy"
            height={300}
            width={200}
            className="object-cover transition-all group-hover:scale-105 inset-0 w-full h-full bg-transparent"
            src={model.src}
          />
        </div>
      )}
      <div className="flex flex-col space-y-2 flex-1">
        <div
          className={`flex-1 subpixel-antialiased text-${textSize} leading-loose tracking-widest markdown-content`}
        >
          <Markdown remarkPlugins={[remarkGfm]}>{model.title}</Markdown>
        </div>
        <div className="flex items-center justify-between h-8">
          <div className="flex items-center gap-4">
            {index > 0 && (
              <Button
                variant="ghost"
                type="button"
                size="icon"
                className="text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  // // navigate to /<entityId>/child/<childId>
                  router.push(`/entities/${entityId}/child/${model.id}`);
                }}
              >
                {(model.order ? model.order + 1 : index)
                  .toString()
                  .padStart(3, "0")}
              </Button>
              // <SlokamDisplayDlgTrigger
              //   key={model.id}
              //   triggerTitle={( model.order ? model.order + 1 : index )
              //     .toString()
              //     .padStart( 3, "0" )}
              //   forSlokamId={model.id}
              // />
            )}
            {model.subTitle && (
              <div className="text-sm text-muted-foreground">
                {model.subTitle}
              </div>
            )}
          </div>
          {/* Stays laid out while hidden: a menu anchored to a button that
              loses its box (display: none) jumps to the top-left corner. */}
          <div
            className={cn(
              "flex flex-row items-center gap-1 transition-opacity",
              isTouchDevice || isCurrent || isMoreMenuOpen || audioDialogOpen
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {model.audio ? (
              <AudioPlayPauseButton track={track} contextId={entityId} plain />
            ) : (
              <AudioGenPlayPauseButton
                title={track.title}
                onClick={() => setAudioDialogOpen(true)}
              />
            )}
            {onBookmarkClicked && (
              <Button
                size="icon"
                type="button"
                variant="ghost"
                aria-label={model.bookmarked ? "Remove bookmark" : "Bookmark"}
                aria-pressed={!!model.bookmarked}
                onClick={() => onBookmarkClicked(model)}
              >
                {model.bookmarked ? (
                  <Icons.bookmarkCheck size={14} />
                ) : (
                  <Icons.bookmark size={14} />
                )}
              </Button>
            )}
            <DropdownMenu open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  type="button"
                  variant="ghost"
                  aria-label="More actions"
                  title="More actions"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64"
                // rendered in a portal, but clicks still bubble to the tile
                onClick={(e) => e.stopPropagation()}
              >
                {model.audio && (
                  <>
                    {entityId && (
                      <DropdownMenuItem
                        onClick={() =>
                          playEntity(entityId, "parts", { fromId: track.id })
                        }
                      >
                        <ListVideo /> Play from here
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => dispatch({ type: "play", tracks: [track] })}
                    >
                      <Play /> Play only this
                    </DropdownMenuItem>
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
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => setAudioDialogOpen(true)}>
                  <AudioLines />
                  {model.audio
                    ? "Modify & Regenerate Audio..."
                    : "Generate Audio..."}
                </DropdownMenuItem>
                {model.audio && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setConfirmDeleteAudio(true)}
                  >
                    <Trash2 /> Delete Audio
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    copyToClipboard(model.title);
                    toast.info("Copied to clipboard");
                  }}
                >
                  <Icons.clipboard /> Copy Text
                </DropdownMenuItem>
                {onEditClicked && (
                  <DropdownMenuItem onClick={() => onEditClicked(model)}>
                    <Icons.edit /> Edit Verse
                  </DropdownMenuItem>
                )}
                {onDeleteClicked && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDeleteClicked(model)}
                  >
                    <Icons.trash /> Delete Verse
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      {/* mounted per opening: each one starts from the verse's text */}
      {audioDialogOpen && (
        <GenerateAudioDialog
          open
          onOpenChange={setAudioDialogOpen}
          entityId={model.id}
          title={track.title}
          subtitle={track.subtitle}
        />
      )}
      {confirmDeleteAudio && (
        <DeleteAudioDialog
          open
          onOpenChange={setConfirmDeleteAudio}
          entityId={model.id}
          audioUrl={model.audio}
        />
      )}
    </div>
  );
};
