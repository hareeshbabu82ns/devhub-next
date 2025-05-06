import AssetFileExplorer from "../_components/AssetFileExplorer";
import Header from "../_components/Header";

const AssetsExplore = async ( { params }: { params: Promise<{ assetPath: string[] }> } ) => {
  const resolvedParams = await params;
  const path = ( resolvedParams.assetPath || [ "/" ] ).join( "/" );
  return (
    <main className="flex flex-1 flex-col gap-4 min-h-[calc(100vh_-_theme(spacing.20))]">
      <Header path={path} accept={[ "all" ]} />
      <AssetFileExplorer path={path} />
    </main>
  );
};

export default AssetsExplore;
