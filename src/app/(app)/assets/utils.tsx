export type FileAttributes = {
  id: string;
  name: string;
  downloadURL: string;
  ext: string;
  size: number;
  mtime: Date;
  isDirectory: boolean;
};

export type AssetFileExplorerQuery = {
  total: number;
  assets: FileAttributes[];
};
