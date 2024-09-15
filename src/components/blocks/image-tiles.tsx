import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Edit2Icon as EditIcon, Trash2Icon as DeleteIcon } from "lucide-react";
import { EntityTypeEnum } from "@/lib/types";
import { Badge } from "../ui/badge";
import Image from "next/image";

export interface TileModel {
  id: string;
  title: string;
  type: EntityTypeEnum;
  subTitle?: string;
  src: string;
  childrenCount?: number;
}

interface ArtTileProps extends React.HTMLAttributes<HTMLDivElement> {
  model: TileModel;
  onTileClicked?: (entity: TileModel) => void;
  onDeleteClicked?: (entity: TileModel) => void;
  onEditClicked?: (model: TileModel) => void;
}

export const ArtTile = ({
  model,
  className,
  onEditClicked,
  onDeleteClicked,
  onTileClicked,
}: ArtTileProps) => {
  return (
    <div
      className={cn(
        "group rounded-xl bg-secondary/10 p-4 dark:highlight-white/5 hover:bg-secondary/20 space-y-4 flex flex-col",
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
      <div className="aspect-[9/11] rounded-md transform overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
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
      <div className="flex flex-col flex-grow space-y-1 justify-between gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold group-hover:font-bold text-md line-clamp-2">
            {model.title}
          </h3>
          {model.childrenCount !== undefined && model.childrenCount > 0 && (
            <Badge variant="outline">{model.childrenCount}</Badge>
          )}
        </div>
        <div className="flex items-center justify-between h-10">
          <p className="text-xs text-muted-foreground">{model.subTitle}</p>
          <div className="hidden group-hover:flex">
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
                <EditIcon size={16} />
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
                <DeleteIcon size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
