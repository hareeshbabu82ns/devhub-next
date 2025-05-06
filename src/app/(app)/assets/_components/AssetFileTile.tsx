import { DeleteConfirmDlgTrigger } from "@/components/blocks/DeleteConfirmDlgTrigger";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Icons } from "@/components/utils/icons";
import Image from "next/image";
import { FolderIcon, FileIcon } from "lucide-react";
import { FileAttributes } from "../utils";
import { useCopyToClipboard } from "usehooks-ts";
import { cn } from "@/lib/utils";
import AudioPlayPauseButton from "@/components/blocks/AudioPlayPauseButton";

const AssetFileTile = ({
  file,
  path,
  onDeleteFile,
  onClick,
  asFileSelector = false,
}: {
  path: string;
  file: FileAttributes;
  asFileSelector?: boolean;
  onDeleteFile?: (path: string) => void;
  onClick?: (file: FileAttributes) => void;
}) => {
  const [, copyToClipboard] = useCopyToClipboard();

  const fileActions = (
    <div className="flex flex-col gap-2">
      {["mp3", "wav"].includes(file.ext.toLowerCase()) && (
        <AudioPlayPauseButton
          url={file.downloadURL}
          id={file.id}
          title={`${file.name}`}
        />
      )}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => {
          copyToClipboard(file.downloadURL);
        }}
      >
        <Icons.clipboard className="size-4" />
      </Button>
      <DeleteConfirmDlgTrigger
        onConfirm={() => {
          if (onDeleteFile) onDeleteFile(file.name);
        }}
        title={`Delete Asset: ${path}`}
      >
        <Button type="button" size="icon" variant="ghost">
          <Icons.trash className="size-4" />
        </Button>
      </DeleteConfirmDlgTrigger>
    </div>
  );

  const fileDetails = (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-row justify-between items-center p-2">
          <div className="text-ellipsis line-clamp-2">{file.name}</div>
          {fileActions}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{file.name}</p>
      </TooltipContent>
    </Tooltip>
  );

  if (file.isDirectory) {
    return (
      <div
        className="border p-2  group flex flex-col text-center cursor-pointer"
        onClick={() => onClick && onClick(file)}
      >
        <FolderIcon className="w-16 h-16 flex-1 self-center" />
        <div className="flex flex-col justify-between p-2 items-center">
          <div className="text-ellipsis line-clamp-2">{file.name}</div>
        </div>
      </div>
    );
  }

  if (["jpg", "jpeg", "png", "svg"].includes(file.ext.toLowerCase())) {
    return (
      <div
        className={cn(
          "border p-2  group flex flex-col",
          asFileSelector ? "cursor-pointer" : "",
        )}
        onClick={asFileSelector ? () => onClick && onClick(file) : undefined}
      >
        <Image
          src={file.downloadURL}
          alt={file.name}
          width={300}
          height={200}
          className="object-cover transition-all group-hover:scale-105 inset-0 w-full h-full bg-transparent"
        />
        {fileDetails}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "border p-2  group flex flex-col",
        asFileSelector ? "cursor-pointer" : "",
      )}
      onClick={asFileSelector ? () => onClick && onClick(file) : undefined}
    >
      <div className="text-center flex flex-1 min-h-[250px]">
        <FileIcon className="w-16 h-16 flex-1 self-center" />
      </div>
      {fileDetails}
    </div>
  );
};

export default AssetFileTile;
