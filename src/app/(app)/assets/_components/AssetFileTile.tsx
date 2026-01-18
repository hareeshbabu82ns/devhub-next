import { DeleteConfirmDlgTrigger } from "@/components/blocks/DeleteConfirmDlgTrigger";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Icons } from "@/components/utils/icons";
import OptimizedImage from "@/components/utils/optimized-image";
import { FolderIcon, FileIcon, MoreVertical, Maximize2, FileText, Music, Video } from "lucide-react";
import { FileAttributes } from "../utils";
import { useCopyToClipboard } from "usehooks-ts";
import { cn } from "@/lib/utils";
import AudioPlayPauseButton from "@/components/blocks/AudioPlayPauseButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const AssetFileTile = ({
  file,
  path,
  onDeleteFile,
  onClick,
  onOpenFullscreen,
  asFileSelector = false,
}: {
  path: string;
  file: FileAttributes;
  asFileSelector?: boolean;
  onDeleteFile?: (path: string) => void;
  onClick?: (file: FileAttributes) => void;
  onOpenFullscreen?: () => void;
}) => {
  const [, copyToClipboard] = useCopyToClipboard();
  const isTouchDevice = useMediaQuery("(pointer: coarse)");
  const [isFocused, setIsFocused] = useState(false);
  const tileRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLButtonElement>(null);

  const isImage = ["jpg", "jpeg", "png", "svg", "webp", "gif"].includes(
    file.ext.toLowerCase(),
  );
  const isAudio = ["mp3", "wav", "ogg"].includes(file.ext.toLowerCase());
  const isVideo = ["mp4", "webm", "mov"].includes(file.ext.toLowerCase());
  const isPdf = ["pdf"].includes(file.ext.toLowerCase());

  // Handle keyboard events for the tile
  useEffect(() => {
    if (!isFocused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case " ": // Space key
          e.preventDefault(); // Prevent scrolling
          if (isImage && onOpenFullscreen) {
            onOpenFullscreen();
          } else if (isAudio && audioRef.current) {
            audioRef.current.click();
          }
          break;

        case "Enter":
          if (file.isDirectory || asFileSelector) {
            onClick?.(file);
          } else if (isImage && onOpenFullscreen) {
            onOpenFullscreen();
          }
          break;
      }
    };

    const element = tileRef.current;
    if (element) {
      element.addEventListener("keydown", handleKeyDown);
      return () => element.removeEventListener("keydown", handleKeyDown);
    }
  }, [
    isFocused,
    file,
    isImage,
    isAudio,
    asFileSelector,
    onClick,
    onOpenFullscreen,
  ]);

  // Audio component for both inline and dropdown use
  const audioComponent = isAudio && (
    <AudioPlayPauseButton
      url={file.downloadURL}
      id={file.id}
      title={`${file.name}`}
      ref={audioRef}
    />
  );

  // Mobile/touch action menu
  const actionDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="h-8 w-8 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/90 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="size-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard(file.downloadURL);
          }}
        >
          <Icons.clipboard className="size-4 mr-2" /> Copy URL
        </DropdownMenuItem>
        {isImage && onOpenFullscreen && (
          <DropdownMenuItem onClick={onOpenFullscreen}>
            <Maximize2 className="size-4 mr-2" /> View Fullscreen
          </DropdownMenuItem>
        )}
        {onDeleteFile && (
          <DeleteConfirmDlgTrigger
            onConfirm={() => onDeleteFile(file.name)}
            title="Delete Asset"
            description={
              <>
                Are you sure you want to delete? <br />
                <span className="text-primary font-semibold text-lg">
                  {file.name}
                </span>
                <br />
                <span className="text-muted-foreground text-sm">This action cannot be undone.</span>
              </>
            }
          >
            <DropdownMenuItem
              onSelect={(e) => {
                // Prevent dropdown from closing
                e.preventDefault();
              }}
              className="text-destructive focus:text-destructive"
            >
              <Icons.trash className="size-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DeleteConfirmDlgTrigger>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Desktop action buttons
  const desktopActions = (
    <div className="absolute right-2 top-2 flex flex-row gap-1 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-300 z-20">
      <div className="flex bg-background/60 backdrop-blur-md rounded-lg p-1 border shadow-sm gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 hover:bg-background/80 hover:text-primary transition-colors rounded-md"
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard(file.downloadURL);
          }}
          title="Copy URL to clipboard"
        >
          <Icons.clipboard className="size-3.5" />
        </Button>
        {isImage && onOpenFullscreen && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 hover:bg-background/80 hover:text-primary transition-colors rounded-md"
            onClick={(e) => {
              e.stopPropagation();
              onOpenFullscreen();
            }}
            title="View Fullscreen"
          >
            <Maximize2 className="size-3.5" />
          </Button>
        )}
        {onDeleteFile && (
          <DeleteConfirmDlgTrigger
            onConfirm={() => {
              if (onDeleteFile) onDeleteFile(file.name);
            }}
            title="Delete Asset"
            description={
              <>
                Are you sure you want to delete? <br />
                <span className="text-primary font-semibold text-lg">
                  {file.name}
                </span>
              </>
            }
          >
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive transition-colors rounded-md"
              onClick={(e) => e.stopPropagation()}
              title="Delete Asset"
            >
              <Icons.trash className="size-3.5" />
            </Button>
          </DeleteConfirmDlgTrigger>
        )}
      </div>
    </div>
  );

  // Choose which action display to use based on device type
  const fileActions = isTouchDevice ? (
    <div className="absolute right-2 top-2 z-20">{actionDropdown}</div>
  ) : (
    desktopActions
  );

  const FileIconComponent = () => {
    if (file.isDirectory) return <FolderIcon className="w-12 h-12 text-blue-500/80 drop-shadow-md" />;
    if (isImage) return null; // Handled by optimized image
    if (isAudio) return <Music className="w-12 h-12 text-purple-500/80 drop-shadow-md" />;
    if (isVideo) return <Video className="w-12 h-12 text-pink-500/80 drop-shadow-md" />;
    if (isPdf) return <FileText className="w-12 h-12 text-red-500/80 drop-shadow-md" />;
    return <FileIcon className="w-12 h-12 text-muted-foreground/80 drop-shadow-md" />;
  }

  const fileName = (
    <div className="w-full px-3 py-3 bg-card/50 border-t backdrop-blur-sm">
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <div className="flex flex-col gap-0.5">
            <span className="truncate block text-sm font-medium text-foreground/90 group-hover:text-primary transition-colors text-left">{file.name}</span>
            {!file.isDirectory && (
              <span className="text-[10px] text-muted-foreground uppercase">{file.ext}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{file.name}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );

  // Common props for all tile types
  const tileProps = {
    ref: tileRef,
    tabIndex: 0,
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    className: cn(
      "group relative flex flex-col h-full bg-card/40 border-muted/60 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden",
      asFileSelector || file.isDirectory ? "cursor-pointer" : "",
      isFocused ? "ring-2 ring-primary ring-offset-2" : "",
    ),
    onClick:
      asFileSelector || file.isDirectory
        ? (e: React.MouseEvent) => onClick && onClick(file)
        : undefined,
  };

  if (file.isDirectory) {
    return (
      <Card {...tileProps}>
        <CardContent className="flex-1 flex flex-col items-center justify-center p-6 min-h-[140px] bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent">
          <FolderIcon className="w-16 h-16 text-blue-400 fill-blue-400/20 drop-shadow-sm transition-transform group-hover:scale-110 duration-300" />
          {fileActions}
        </CardContent>
        {fileName}
      </Card>
    );
  }

  if (isImage) {
    return (
      <Card
        {...tileProps}
        onClick={(e) => {
          e.stopPropagation();
          if (asFileSelector && onClick) {
            onClick(file);
          } else if (onOpenFullscreen) {
            onOpenFullscreen();
          }
        }}
      >
        <CardContent className="p-0 relative flex-1 aspect-square bg-muted/20">
          <div className="absolute inset-0 bg-checkerboard opacity-5 pointer-events-none" />
          <OptimizedImage
            src={file.downloadURL}
            alt={file.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-all duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {fileActions}
          {isImage && (
            <Badge variant="secondary" className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-background/60 backdrop-blur-md text-xs h-5 px-1.5 font-normal">
              IMG
            </Badge>
          )}
        </CardContent>
        {fileName}
      </Card>
    );
  }

  // For other file types (documents, audio, etc.)
  return (
    <Card {...tileProps}>
      <CardContent className="flex-1 flex flex-col items-center justify-center p-6 min-h-[140px] relative bg-gradient-to-br from-muted/30 to-transparent">
        <div className="transition-transform group-hover:scale-110 duration-300">
          <FileIconComponent />
        </div>
        {isAudio && (
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-4/5">
            {audioComponent}
          </div>
        )}
        {fileActions}
      </CardContent>
      {fileName}
    </Card>
  );
};

export default AssetFileTile;

