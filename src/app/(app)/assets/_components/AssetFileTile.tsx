import { DeleteConfirmDlgTrigger } from "@/components/blocks/DeleteConfirmDlgTrigger";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Icons } from "@/components/utils/icons";
import Image from "next/image";
import { FolderIcon, FileIcon, MoreVertical, Maximize2 } from "lucide-react";
import { FileAttributes } from "../utils";
import { useCopyToClipboard } from "usehooks-ts";
import { cn } from "@/lib/utils";
import AudioPlayPauseButton from "@/components/blocks/AudioPlayPauseButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useEffect, useRef, useState } from "react";

const AssetFileTile = ( {
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
  onDeleteFile?: ( path: string ) => void;
  onClick?: ( file: FileAttributes ) => void;
  onOpenFullscreen?: () => void;
} ) => {
  const [ , copyToClipboard ] = useCopyToClipboard();
  const isTouchDevice = useMediaQuery( "(pointer: coarse)" );
  const [ isFocused, setIsFocused ] = useState( false );
  const tileRef = useRef<HTMLDivElement>( null );
  const audioRef = useRef<HTMLButtonElement>( null );

  const isImage = [ "jpg", "jpeg", "png", "svg", "webp", "gif" ].includes( file.ext.toLowerCase() );
  const isAudio = [ "mp3", "wav", "ogg" ].includes( file.ext.toLowerCase() );

  // Handle keyboard events for the tile
  useEffect( () => {
    if ( !isFocused ) return;

    const handleKeyDown = ( e: KeyboardEvent ) => {
      switch ( e.key ) {
        case " ":  // Space key
          e.preventDefault(); // Prevent scrolling
          if ( isImage && onOpenFullscreen ) {
            onOpenFullscreen();
          } else if ( isAudio && audioRef.current ) {
            audioRef.current.click();
          }
          break;

        case "Enter":
          if ( file.isDirectory || asFileSelector ) {
            onClick && onClick( file );
          } else if ( isImage && onOpenFullscreen ) {
            onOpenFullscreen();
          }
          break;
      }
    };

    const element = tileRef.current;
    if ( element ) {
      element.addEventListener( "keydown", handleKeyDown );
      return () => element.removeEventListener( "keydown", handleKeyDown );
    }
  }, [ isFocused, file, isImage, isAudio, asFileSelector, onClick, onOpenFullscreen ] );

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
          variant="ghost"
          className="h-8 w-8 bg-background/80"
          onClick={( e ) => e.stopPropagation()}
        >
          <MoreVertical className="size-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={( e ) => {
            e.stopPropagation();
            copyToClipboard( file.downloadURL );
          }}
        >
          <Icons.clipboard className="size-4 mr-1" /> Copy URL
        </DropdownMenuItem>
        {isImage && onOpenFullscreen && (
          <DropdownMenuItem onClick={onOpenFullscreen}>
            <Maximize2 className="size-4 mr-1" /> View Fullscreen
          </DropdownMenuItem>
        )}
        {onDeleteFile && (
          <DeleteConfirmDlgTrigger
            onConfirm={() => onDeleteFile( file.name )}
            title="Delete Asset"
            description={
              <>
                Are you sure you want to delete? <br /><span className="text-primary font-semibold text-lg">{file.name}</span>
              </>
            }
          >
            <DropdownMenuItem
              onSelect={( e ) => {
                // Prevent dropdown from closing
                e.preventDefault();
              }}
              className="text-destructive focus:text-destructive"
            >
              <Icons.trash className="size-4 mr-1" />Delete
            </DropdownMenuItem>
          </DeleteConfirmDlgTrigger>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Desktop action buttons
  const desktopActions = (
    <div className="flex flex-row gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity absolute right-2 top-2 bg-background/80 rounded p-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={( e ) => {
          e.stopPropagation();
          copyToClipboard( file.downloadURL );
        }}
        title="Copy URL to clipboard"
      >
        <Icons.clipboard className="size-4" />
      </Button>
      {onDeleteFile && (
        <DeleteConfirmDlgTrigger
          onConfirm={() => {
            if ( onDeleteFile ) onDeleteFile( file.name );
          }}
          title="Delete Asset"
          description={
            <>
              Are you sure you want to delete? <br /><span className="text-primary font-semibold text-lg">{file.name}</span>
            </>
          }
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={( e ) => e.stopPropagation()}
            title="Delete Asset"
          >
            <Icons.trash className="size-4 text-destructive" />
          </Button>
        </DeleteConfirmDlgTrigger>
      )}
    </div>
  );

  // Choose which action display to use based on device type
  const fileActions = isTouchDevice ? (
    <div className="absolute right-2 top-2 z-10">{actionDropdown}</div>
  ) : desktopActions;

  const fileName = (
    <div className="w-full truncate text-sm font-medium text-center p-2 bg-muted/30">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="truncate block">{file.name}</span>
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
    onFocus: () => setIsFocused( true ),
    onBlur: () => setIsFocused( false ),
    className: cn(
      "border rounded-md overflow-hidden group relative flex flex-col h-full transition-all",
      ( asFileSelector || file.isDirectory ) ? "cursor-pointer" : "",
      isFocused ? "ring-2 ring-ring" : "hover:shadow-md",
    ),
    onClick: ( asFileSelector || file.isDirectory ) ?
      ( e: React.MouseEvent ) => onClick && onClick( file ) : undefined
  };

  if ( file.isDirectory ) {
    return (
      <div {...tileProps}>
        <div className="flex-1 flex items-center justify-center p-4 min-h-[180px]">
          <FolderIcon className="w-16 h-16 text-muted-foreground" />
        </div>
        {fileName}
      </div>
    );
  }

  if ( isImage ) {
    return (
      <div
        {...tileProps}
        onClick={( e ) => {
          e.stopPropagation();
          if ( asFileSelector && onClick ) {
            onClick( file );
          } else if ( onOpenFullscreen ) {
            onOpenFullscreen();
          }
        }}
      >
        <div className="relative flex-1 aspect-square">
          <Image
            src={file.downloadURL}
            alt={file.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-all group-hover:scale-105"
          />
          {fileActions}
        </div>
        {fileName}
      </div>
    );
  }

  // For other file types (documents, audio, etc.)
  return (
    <div {...tileProps}>
      <div className="flex-1 flex items-center justify-center p-4 min-h-[180px] relative">
        <FileIcon className="w-16 h-16 text-muted-foreground" />
        {isAudio && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
            {audioComponent}
          </div>
        )}
        {fileActions}
      </div>
      {fileName}
    </div>
  );
};

export default AssetFileTile;
