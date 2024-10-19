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
import MultipleFileUploadForm from "../utils/multi-file-upload-form";
import { useRouter } from "next/navigation";
import SingleFileUploadForm from "../utils/single-file-upload-form";
import { UploadFileType } from "@/types";

interface FileUploadDlgTriggerProps extends DialogProps {
  currentPath?: string;
  accept?: UploadFileType[];
  multiple?: boolean;
  onUploaded?: (path: string[]) => void | undefined;
}
export default function FileUploadDlgTrigger({
  // onUploaded,
  currentPath,
  accept = ["image/jpeg", "image/png", "image/jpeg"],
  multiple = true,
  onUploaded,
  ...rest
}: FileUploadDlgTriggerProps) {
  const router = useRouter();
  // const [path, setPath] = useState<string>(currentPath || "");

  return (
    <Dialog {...rest}>
      <DialogTrigger asChild>
        <Button variant="ghost" type="button" size="icon">
          <AddIcon className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:w-5/6 sm:h-5/6 h-full sm:max-w-none flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>
        {multiple ? (
          <MultipleFileUploadForm
            allowedTypes={accept}
            basePath={`/uploads/${currentPath}`}
            onUploadSuccess={async (urls: string[]) => {
              onUploaded && onUploaded(urls);
              // router.refresh();
            }}
          />
        ) : (
          <SingleFileUploadForm
            allowedTypes={accept}
            basePath={`/uploads/${currentPath}`}
            onUploadSuccess={async (urls: string[]) => {
              onUploaded && onUploaded(urls);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
