import {
  FileArchive,
  FileAudio,
  FileIcon,
  FileText,
  FileType2,
  FileVideo,
  Folder,
  ImageIcon,
  LucideProps,
} from "lucide-react";
import { AssetKind } from "@/lib/assets/shared";
import { cn } from "@/lib/utils";

const ICONS: Record<AssetKind, React.ComponentType<LucideProps>> = {
  folder: Folder,
  image: ImageIcon,
  audio: FileAudio,
  video: FileVideo,
  pdf: FileType2,
  text: FileText,
  archive: FileArchive,
  other: FileIcon,
};

const COLORS: Record<AssetKind, string> = {
  folder: "text-sky-500",
  image: "text-emerald-500",
  audio: "text-violet-500",
  video: "text-pink-500",
  pdf: "text-red-500",
  text: "text-amber-500",
  archive: "text-orange-500",
  other: "text-muted-foreground",
};

export function AssetKindIcon({
  kind,
  className,
  ...props
}: { kind: AssetKind } & LucideProps) {
  const Icon = ICONS[kind];
  return (
    <Icon
      aria-hidden
      className={cn(COLORS[kind], kind === "folder" && "fill-sky-500/15", className)}
      {...props}
    />
  );
}
