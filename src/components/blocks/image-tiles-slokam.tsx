import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { ENTITY_DEFAULT_IMAGE_THUMBNAIL } from "@/lib/constants";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCopyToClipboard } from "usehooks-ts";
import AudioPlayPauseButton from "./AudioPlayPauseButton";
import Image from "next/image";
import SlokamDisplayDlgTrigger from "./SlokamDisplayDlgTrigger";
import { Icons } from "../utils/icons";
import { TileModel } from "@/types/entities";
import { toast } from "sonner";
import { useTextSizeAtomValue } from "@/hooks/use-config";
import { useMediaQuery } from "@/hooks/use-media-query";

interface ArtSlokamTileProps extends React.HTMLAttributes<HTMLDivElement> {
  index?: number;
  model: TileModel;
  onTileClicked?: ( entity: TileModel ) => void;
  onDeleteClicked?: ( entity: TileModel ) => void;
  onEditClicked?: ( model: TileModel ) => void;
  onBookmarkClicked?: ( model: TileModel ) => void;
}

export const ArtSlokamTile = ( {
  index = 0,
  model,
  className,
  onEditClicked,
  onDeleteClicked,
  onTileClicked,
  onBookmarkClicked,
}: ArtSlokamTileProps ) => {
  const textSize = useTextSizeAtomValue();
  const [ , copyToClipboard ] = useCopyToClipboard();
  const isTouchDevice = useMediaQuery( "(pointer: coarse)" );

  return (
    <div
      className={cn(
        "group rounded-xl p-4 border dark:highlight-white/5 hover:bg-secondary/10 space-y-2 flex flex-row space-x-4",
        onTileClicked ? "cursor-pointer" : "",
        model.bookmarked ? "border-success/50" : "",
        className,
      )}
      onClick={( e ) => {
        if ( onTileClicked ) {
          e.stopPropagation();
          onTileClicked( model );
        }
      }}
    >
      {model.src && model.src !== ENTITY_DEFAULT_IMAGE_THUMBNAIL && (
        <div className="aspect-[9/11] w-[150px] rounded-md transform overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
          <Image
            alt={model.title}
            decoding="async"
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
          <Markdown remarkPlugins={[ remarkGfm ]}>{model.title}</Markdown>
        </div>
        <div className="flex items-center justify-between h-8">
          <div className="flex items-center gap-4">
            {index > 0 && (
              <SlokamDisplayDlgTrigger
                key={model.id}
                triggerTitle={( model.order ? model.order + 1 : index )
                  .toString()
                  .padStart( 3, "0" )}
                forSlokamId={model.id}
              />
            )}
            {model.subTitle && (
              <div className="text-sm text-muted-foreground">
                {model.subTitle}
              </div>
            )}
          </div>
          <div className={cn( "hidden group-hover:flex flex-row",
            isTouchDevice && "flex",
          )}>
            {model.audio && (
              <AudioPlayPauseButton
                url={model.audio}
                id={model.id}
                title={`${String( index ).padStart( 3, "0" )}-${model.parentTitle || ""}-${model.subTitle}`}
              />
            )}
            <Button
              size="icon"
              type="button"
              variant="ghost"
              onClick={( e ) => {
                copyToClipboard( model.title );
                toast.info( "Copied to clipboard" );
                e.stopPropagation();
              }}
            >
              <Icons.clipboard size={14} />
            </Button>
            {onBookmarkClicked && (
              <Button
                size="icon"
                type="button"
                variant="ghost"
                onClick={( e ) => {
                  onBookmarkClicked( model );
                  e.stopPropagation();
                }}
              >
                {model.bookmarked ? (
                  <Icons.bookmarkCheck size={14} />
                ) : (
                  <Icons.bookmark size={14} />
                )}
              </Button>
            )}
            {onEditClicked && (
              <Button
                size="icon"
                type="button"
                variant="ghost"
                onClick={( e ) => {
                  onEditClicked( model );
                  e.stopPropagation();
                }}
              >
                <Icons.edit size={14} />
              </Button>
            )}
            {onDeleteClicked && (
              <Button
                size="icon"
                type="button"
                variant="ghost"
                color="danger"
                onClick={( e ) => {
                  onDeleteClicked( model );
                  e.stopPropagation();
                }}
              >
                <Icons.trash size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
