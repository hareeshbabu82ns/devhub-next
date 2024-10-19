import AssetFileExplorer from "../_components/AssetFileExplorer";
import Header from "../_components/Header";

const AssetsExplore = ({ params }: { params: { assetPath: string[] } }) => {
  const path = (params.assetPath || ["/"]).join("/");
  return (
    <main className="flex flex-1 flex-col gap-4 min-h-[calc(100vh_-_theme(spacing.20))]">
      <Header path={path} accept={["all"]} />
      <AssetFileExplorer path={path} />
    </main>
  );
};

export default AssetsExplore;
