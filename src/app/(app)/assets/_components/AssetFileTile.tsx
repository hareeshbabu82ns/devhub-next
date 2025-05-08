import { DeleteConfirmDlgTrigger } from "@/components/blocks/DeleteConfirmDlgTrigger";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Icons } from "@/components/utils/icons";
import Image from "next/image";
import { FolderIcon, FileIcon, MoreVertical } from "lucide-react";
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
import { useState } from "react";

const AssetFileTile = ( {
  file,
  path,
  onDeleteFile,
  onClick,
  asFileSelector = false,
}: {
  path: string;
  file: FileAttributes;
  asFileSelector?: boolean;
  onDeleteFile?: ( path: string ) => void;
  onClick?: ( file: FileAttributes ) => void;
} ) => {
  const [ , copyToClipboard ] = useCopyToClipboard();
  const isTouchDevice = useMediaQuery( "(pointer: coarse)" );
  const [ isFocused, setIsFocused ] = useState( false );

  // Audio component for both inline and dropdown use
  const audioComponent = [ "mp3", "wav" ].includes( file.ext.toLowerCase() ) && (
    <AudioPlayPauseButton
      url={file.downloadURL}
      id={file.id}
      title={`${file.name}`}
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
          className="h-8 w-8"
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
      {/* {audioComponent} */}
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
            <Icons.trash className="size-4" />
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
    tabIndex: 0,
    onFocus: () => setIsFocused( true ),
    onBlur: () => setIsFocused( false ),
    className: cn(
      "border rounded-md overflow-hidden group relative flex flex-col h-full transition-all",
      asFileSelector || file.isDirectory ? "cursor-pointer" : "",
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

  if ( [ "jpg", "jpeg", "png", "svg", "webp" ].includes( file.ext.toLowerCase() ) ) {
    return (
      <div {...tileProps}>
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
        {[ "mp3", "wav" ].includes( file.ext.toLowerCase() ) && (
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
