"use client";

import { FileAttributes } from "../utils";
import {
  FolderIcon,
  FileIcon,
  Clipboard as ClipboardIcon,
  Trash2 as FileDeleteIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "usehooks-ts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Loader from "@/components/utils/loader";
import { deleteAsset, exploreAssets } from "../actions";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SimpleAlert from "@/components/utils/SimpleAlert";
import Image from "next/image";
import { DeleteConfirmDlgTrigger } from "@/components/blocks/DeleteConfirmDlgTrigger";

const AssetFileExplorer = ({ path }: { path: string }) => {
  // const searchParams = useSearchParams();
  // const path = searchParams?.get("path") || "/";

  const { data, error, isFetching, isPending, refetch } = useQuery({
    queryKey: ["assetFileExplorer", path],
    queryFn: async () => {
      const data = await exploreAssets(path);
      return data;
    },
  });

  const onDeleteFile = async (name: string) => {
    await deleteAsset(`${path}/${name}`);
    refetch();
  };

  if (isFetching || isPending) return <Loader />;
  if (error) return <SimpleAlert title={error.message} />;

  if (!data || !data.assets)
    return <SimpleAlert title={`Could not fetch assets at path ${path}`} />;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-6 gap-4">
      {data.assets.map((file) => (
        <FileTile key={file.name} file={file} onDeleteFile={onDeleteFile} />
      ))}
    </div>
  );
};

const FileTile = ({
  file,
  onDeleteFile,
}: {
  file: FileAttributes;
  onDeleteFile?: (path: string) => void;
}) => {
  const [, copyToClipboard] = useCopyToClipboard();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const path = searchParams?.get("path") || "/";

  const onClick = () => {
    if (file.isDirectory) {
      const newPath = `${path}/${file.name}`;
      router.push(`${pathname}/${newPath}`);
      // const newSearchString = createQueryString({
      //   path: newPath,
      // });
      // router.push(`${pathname}?${newSearchString}`);
    }
  };

  const fileActions = (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => {
          copyToClipboard(file.downloadURL);
        }}
      >
        <ClipboardIcon className="size-4" />
      </Button>
      <DeleteConfirmDlgTrigger
        onConfirm={() => {
          onDeleteFile && onDeleteFile(file.name);
        }}
        title={`Delete Asset: ${path}`}
      >
        <Button type="button" size="icon" variant="ghost">
          <FileDeleteIcon className="size-4" />
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
        onClick={onClick}
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
      <div className="border p-2  group flex flex-col">
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
    <div className="border p-4 flex flex-col">
      <div className="text-center flex flex-1">
        <FileIcon className="w-16 h-16 flex-1 self-center" />
      </div>
      {fileDetails}
    </div>
  );
};

export default AssetFileExplorer;
