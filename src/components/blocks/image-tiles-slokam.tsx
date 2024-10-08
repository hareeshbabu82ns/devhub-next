import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  Edit2Icon as EditIcon,
  Trash2Icon as DeleteIcon,
  ClipboardIcon,
} from "lucide-react";
import { EntityTypeEnum } from "@/lib/types";
import { ENTITY_DEFAULT_IMAGE_THUMBNAIL } from "@/lib/constants";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCopyToClipboard, useLocalStorage } from "usehooks-ts";
import {
  TEXT_SIZE_SELECT_DEFAULT,
  TEXT_SIZE_SELECT_KEY,
} from "./text-size-selector";
import AudioPlayPauseButton from "./AudioPlayPauseButton";
import Image from "next/image";
import SlokamDisplayDlgTrigger from "./SlokamDisplayDlgTrigger";
// import SlokamDisplayDlgTrigger from "./SlokamDisplayDlgTrigger";
// import AudioPlayPauseButton from "./AudioPlayPauseButton";

export interface TileModel {
  id: string;
  title: string;
  type: EntityTypeEnum;
  subTitle?: string;
  src: string;
  audio?: string;
  order?: number;
}

interface ArtSlokamTileProps extends React.HTMLAttributes<HTMLDivElement> {
  index?: number;
  model: TileModel;
  onTileClicked?: (entity: TileModel) => void;
  onDeleteClicked?: (entity: TileModel) => void;
  onEditClicked?: (model: TileModel) => void;
}

export const ArtSlokamTile = ({
  index = 0,
  model,
  className,
  onEditClicked,
  onDeleteClicked,
  onTileClicked,
}: ArtSlokamTileProps) => {
  const [textSize] = useLocalStorage(
    TEXT_SIZE_SELECT_KEY,
    TEXT_SIZE_SELECT_DEFAULT,
  );
  const [, copyToClipboard] = useCopyToClipboard();

  return (
    <div
      className={cn(
        "group rounded-xl p-4 border dark:highlight-white/5 hover:bg-secondary/10 space-y-2 flex flex-row space-x-4",
        onTileClicked ? "cursor-pointer" : "",
        className,
      )}
      onClick={(e) => {
        if (onTileClicked) {
          onTileClicked(model);
          e.stopPropagation();
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
          className={`flex-1 antialiased text-${textSize} leading-8 tracking-wider`}
        >
          <Markdown remarkPlugins={[remarkGfm]}>{model.title}</Markdown>
        </div>
        <div className="flex items-center justify-between h-8">
          <div>
            {index > 0 && (
              <SlokamDisplayDlgTrigger
                key={model.id}
                triggerTitle={(model.order ? model.order + 1 : index)
                  .toString()
                  .padStart(3, "0")}
                forSlokamId={model.id}
              />
            )}
          </div>
          <div className="hidden group-hover:flex flex-row">
            {model.audio && <AudioPlayPauseButton url={model.audio} />}
            <Button
              size="icon"
              type="button"
              variant="ghost"
              onClick={(e) => {
                copyToClipboard(model.title);
                e.stopPropagation();
              }}
            >
              <ClipboardIcon size={14} />
            </Button>
            {onEditClicked && (
              <Button
                size="icon"
                type="button"
                variant="ghost"
                onClick={(e) => {
                  onEditClicked(model);
                  e.stopPropagation();
                }}
              >
                <EditIcon size={14} />
              </Button>
            )}
            {onDeleteClicked && (
              <Button
                size="icon"
                type="button"
                variant="ghost"
                color="danger"
                onClick={(e) => {
                  onDeleteClicked(model);
                  e.stopPropagation();
                }}
              >
                <DeleteIcon size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
