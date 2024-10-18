"use client";

import { FileAttributes } from "../utils";
import Loader from "@/components/utils/loader";
import { deleteAsset, exploreAssets } from "../actions";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import SimpleAlert from "@/components/utils/SimpleAlert";
import { useSearchParamsUpdater } from "@/hooks/use-search-params-updater";
import AssetFileTile from "./AssetFileTile";

const AssetFileExplorer = ({ path }: { path: string }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { searchParams } = useSearchParamsUpdater();
  const currentPath = searchParams?.get("path") || "/";

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
  const onClick = (file: FileAttributes) => {
    if (file.isDirectory) {
      // const newPath = `${path}/${file.name}`;
      // router.push(`${pathname}/${newPath}`);
      const newPath = `${pathname}/${file.name}`;
      router.push(`${newPath}`);
    }
  };

  if (isFetching || isPending) return <Loader />;
  if (error) return <SimpleAlert title={error.message} />;

  if (!data || !data.assets)
    return <SimpleAlert title={`Could not fetch assets at path ${path}`} />;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-6 gap-4">
      {data.assets.map((file) => (
        <AssetFileTile
          key={file.name}
          file={file}
          path={currentPath}
          onDeleteFile={onDeleteFile}
          onClick={onClick}
        />
      ))}
    </div>
  );
};

export default AssetFileExplorer;
