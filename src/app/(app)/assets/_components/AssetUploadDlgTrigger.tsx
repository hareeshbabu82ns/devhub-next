import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileUp as AddIcon } from "lucide-react";
import { DialogProps } from "@radix-ui/react-dialog";
import AssetFileSelector from "./AssetFileSelector";
import { UploadFileType } from "@/types";

interface AssetSelectDlgTriggerProps extends DialogProps {
  currentPath?: string;
  accept?: UploadFileType[];
  onSelected?: (path: string[]) => void | undefined;
}
export default function AssetSelectDlgTrigger({
  currentPath = "/",
  accept,
  onSelected,
  ...rest
}: AssetSelectDlgTriggerProps) {
  // const router = useRouter();
  // const [path, setPath] = useState<string>(currentPath || "");

  const path = currentPath.startsWith("/api/assets/uploads/")
    ? currentPath
        .replace("/api/assets/uploads", "")
        .split("/")
        .slice(0, -1)
        .join("/")
    : currentPath.startsWith("http")
      ? "/"
      : currentPath;
  // console.log({ currentPath, path });

  return (
    <Dialog {...rest}>
      <DialogTrigger asChild>
        <Button variant="ghost" type="button" size="icon">
          <AddIcon className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:w-5/6 sm:h-5/6 h-full sm:max-w-none flex flex-col">
        <DialogHeader>
          <DialogTitle>Assets</DialogTitle>
        </DialogHeader>

        <AssetFileSelector
          path={path}
          accept={accept}
          onSelection={(url) => {
            onSelected && onSelected([url]);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
