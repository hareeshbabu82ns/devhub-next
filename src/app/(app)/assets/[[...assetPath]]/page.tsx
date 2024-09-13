import AssetFileExplorer from "../_components/AssetFileExplorer";
import Header from "../_components/Header";

const AssetsExplore = ({ params }: { params: { assetPath: string[] } }) => {
  const path = (params.assetPath || ["/"]).join("/");
  return (
    <main className="flex flex-1 flex-col gap-4">
      <Header path={path} />
      <AssetFileExplorer path={path} />
    </main>
  );
};

export default AssetsExplore;
