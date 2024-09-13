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
import FileUploader from "@/components/inputs/FileUploader";
import { useState } from "react";
import Image from "next/image";
import MultipleFileUploadForm from "../utils/multi-file-upload-form";
import { useRouter } from "next/navigation";

interface FileUploadDlgTriggerProps extends DialogProps {
  currentPath?: string;
  accept?: string;
  onUploaded?: (path: string) => void | undefined;
}
export default function FileUploadDlgTrigger({
  // onUploaded,
  currentPath,
  accept = "*.*",
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
        <MultipleFileUploadForm
          allowedTypes={["image/jpeg", "image/png", "image/jpeg"]}
          basePath={`/uploads/${currentPath}`}
          onUploadSuccess={async (urls: string[]) => {
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
