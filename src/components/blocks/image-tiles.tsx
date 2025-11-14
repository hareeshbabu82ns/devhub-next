import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  Edit2Icon as EditIcon,
  Trash2Icon as DeleteIcon,
  MoreHorizontalIcon,
  BookmarkIcon,
  ShareIcon,
} from "lucide-react";
import { Badge } from "../ui/badge";
import OptimizedImage from "../utils/optimized-image";
import { TileModel } from "@/types/entities";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

interface ArtTileProps extends React.HTMLAttributes<HTMLDivElement> {
  model: TileModel;
  onTileClicked?: (entity: TileModel) => void;
  onDeleteClicked?: (entity: TileModel) => void;
  onEditClicked?: (model: TileModel) => void;
  onBookmarkClicked?: (model: TileModel) => void;
  onShareClicked?: (model: TileModel) => void;
}

export const ArtTile = ({
  model,
  className,
  onEditClicked,
  onDeleteClicked,
  onTileClicked,
  onBookmarkClicked,
  onShareClicked,
}: ArtTileProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const isTouchDevice = useMediaQuery("(pointer: coarse)");

  // Create an array of available actions to determine visibility and ordering
  const actions = [
    onEditClicked && {
      id: "edit",
      icon: <EditIcon className="size-4" />,
      label: "Edit",
      handler: (e: React.MouseEvent) => {
        onEditClicked(model);
        e.stopPropagation();
      },
      ariaLabel: `Edit ${model.title}`,
    },
    onBookmarkClicked && {
      id: "bookmark",
      icon: <BookmarkIcon className="size-4" />,
      label: "Bookmark",
      handler: (e: React.MouseEvent) => {
        onBookmarkClicked(model);
        e.stopPropagation();
      },
      ariaLabel: `Bookmark ${model.title}`,
    },
    onShareClicked && {
      id: "share",
      icon: <ShareIcon className="size-4" />,
      label: "Share",
      handler: (e: React.MouseEvent) => {
        onShareClicked(model);
        e.stopPropagation();
      },
      ariaLabel: `Share ${model.title}`,
    },
    onDeleteClicked && {
      id: "delete",
      icon: <DeleteIcon className="size-4" />,
      label: "Delete",
      handler: (e: React.MouseEvent) => {
        onDeleteClicked(model);
        e.stopPropagation();
      },
      ariaLabel: `Delete ${model.title}`,
      destructive: true,
    },
  ].filter(Boolean);

  // Show direct actions if there are 2 or fewer actions
  // Only use the more actions dropdown if there are 3 or more actions
  const shouldShowMoreDropdown = actions.length > 2;
  const visibleActions = shouldShowMoreDropdown ? actions.slice(0, 2) : actions;
  const overflowActions = shouldShowMoreDropdown ? actions.slice(2) : [];

  /* Action buttons - Positioned in the top-right corner */
  const actionButtons = actions.length > 0 && (
    <div
      className={cn(
        "flex gap-1 transition-opacity",
        // Show buttons by default on touch devices, otherwise only on hover/focus
        isTouchDevice
          ? "opacity-100"
          : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
      )}
    >
      {/* Show direct action buttons on all devices (both mobile and desktop) */}
      {visibleActions.map((action) => (
        <Button
          key={action?.id}
          size="icon"
          variant="ghost"
          title={action?.label}
          className={cn(
            "size-6 text-primary",
            action?.destructive && "text-destructive",
          )}
          onClick={action?.handler}
          aria-label={action?.ariaLabel}
        >
          {action?.icon}
        </Button>
      ))}

      {/* Only show more dropdown if there are more than 2 actions */}
      {shouldShowMoreDropdown && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-6 text-primary opacity-70 hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
              aria-label="More actions"
            >
              <MoreHorizontalIcon className="size-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {overflowActions.map((action) => (
              <DropdownMenuItem
                key={action?.id}
                onClick={action?.handler}
                className={cn(action?.destructive && "text-destructive")}
              >
                <span className="mr-2">{action?.icon}</span>
                {action?.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "group relative rounded-xl overflow-hidden aspect-square sm:aspect-[4/5] md:aspect-[3/4] lg:aspect-[9/11] shadow-md hover:shadow-lg transition-all duration-300",
        "ring-1 ring-primary/70",
        onTileClicked &&
          "cursor-pointer hover:ring-offset-2 hover:ring-2 ring-offset-background",
        (isFocused || onTileClicked) && "hover:ring-primary ring-primary",
        // ( isFocused || onTileClicked ) && "cursor-pointer ring-offset-2 ring-primary/50",
        // isFocused && "ring-2",
        className,
      )}
      onClick={(e) => {
        if (onTileClicked) {
          onTileClicked(model);
          e.stopPropagation();
        }
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      tabIndex={onTileClicked ? 0 : -1}
      role={onTileClicked ? "button" : "presentation"}
      aria-label={onTileClicked ? `Open ${model.title}` : undefined}
    >
      {/* Image covering the entire component */}
      <div className="absolute inset-0 w-full h-full">
        <OptimizedImage
          alt={model.title}
          loading="lazy"
          height={400}
          width={300}
          className="object-cover transition-all group-hover:scale-105 w-full h-full"
          src={model.src}
        />
      </div>

      {/* Text overlay with gradient background at the bottom */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/50 to-transparent p-4 backdrop-blur-[2px] transition-all duration-300 group-hover:backdrop-blur-[4px]">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold group-hover:font-bold text-md line-clamp-2 text-white subpixel-antialiased leading-tight tracking-wide">
              {model.title}
            </h3>
            {model.childrenCount !== undefined && model.childrenCount > 0 && (
              <Badge variant="outline">{model.childrenCount}</Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-200 opacity-90 line-clamp-1">
              {model.subTitle}
            </p>
            {actionButtons}
          </div>
        </div>
      </div>
    </div>
  );
};
