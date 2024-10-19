"use client";

import { FileAttributes } from "../utils";
import Loader from "@/components/utils/loader";
import { deleteAsset, exploreAssets } from "../actions";
import { useQuery } from "@tanstack/react-query";
import SimpleAlert from "@/components/utils/SimpleAlert";
import AssetFileTile from "./AssetFileTile";
import { useState } from "react";
import Header from "./Header";
import { UploadFileType } from "@/types";

const AssetFileSelector = ({
  path,
  accept,
  onSelection,
}: {
  path: string;
  accept?: UploadFileType[];
  onSelection: (path: string) => void;
}) => {
  const [currentPath, setPath] = useState(path);

  const { data, error, isFetching, isPending, refetch } = useQuery({
    queryKey: ["assetFileSelector", currentPath],
    queryFn: async () => {
      const data = await exploreAssets(currentPath);
      return data;
    },
  });

  const onDeleteFile = async (name: string) => {
    await deleteAsset(`${currentPath}/${name}`);
    refetch();
  };

  const onClick = (file: FileAttributes) => {
    // console.log("file", file);
    if (file.isDirectory) {
      const newPath = `${currentPath}/${file.name}`;
      setPath(newPath);
      // router.push(`${newPath}`);
    } else {
      onSelection && onSelection(file.downloadURL);
    }
  };

  if (isFetching || isPending) return <Loader />;
  if (error) return <SimpleAlert title={error.message} />;

  if (!data || !data.assets)
    return (
      <SimpleAlert title={`Could not fetch assets at path ${currentPath}`} />
    );

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
      <Header
        path={currentPath}
        accept={accept}
        asSelector
        onPathChange={setPath}
        refresh={refetch}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-6 gap-4">
        {data.assets.map((file) => (
          <AssetFileTile
            key={file.name}
            file={file}
            path={currentPath}
            onDeleteFile={onDeleteFile}
            onClick={onClick}
            asFileSelector
          />
        ))}
      </div>
    </div>
  );
};

export default AssetFileSelector;
