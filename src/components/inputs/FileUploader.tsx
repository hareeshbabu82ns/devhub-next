import { useRef, useState } from "react";
import { Input, InputProps } from "../ui/input";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import {
  FileUpIcon as UploadIcon,
  ScanSearch as SelectIcon,
  Trash2 as DeleteIcon,
  ClipboardIcon,
} from "lucide-react";
import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "sonner";
import { deleteAsset } from "@/app/(app)/assets/actions";

interface FileUploaderProps extends InputProps {
  path: string;
  containerClassName?: string;
  label?: string;
  onUploadChange?: (path: string) => void;
}

interface FileResponse {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  filename: string;
  path: string;
}

const FileUploader = ({
  id,
  path,
  containerClassName,
  onUploadChange,
  ...restInputProps
}: FileUploaderProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileResp, setFileResp] = useState<string>("");

  const [, copyToClipboard] = useCopyToClipboard();
  const inputRef = useRef<HTMLInputElement>(null);

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setFile(e.target.files ? e.target.files[0] : null);
  };

  const onFileUpload = async () => {
    const formData = new FormData();
    if (!file) return;
    formData.append("media", file);
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const {
      data,
      error,
    }: {
      data: {
        url: string[];
      } | null;
      error: string | null;
    } = await response.json();
    if (error || !data) {
      toast.error("File upload failed!", { id: "file-upload-error" });
      return;
    }
    setFileResp(data.url[0]);
    onUploadChange?.(data?.url[0] || "");
  };

  const onDeleteUpload = async () => {
    await deleteAsset(fileResp);
    setFileResp("");
    setFile(null);
    onUploadChange?.("");
  };

  return (
    <div className="flex flex-row gap-2">
      <div className={cn("relative flex flex-1", containerClassName)}>
        <Input
          type="text"
          placeholder="File Upload..."
          value={fileResp || file?.name || ""}
          readOnly
          className="pr-10"
        />
        {fileResp === null ? (
          <Button
            type="button"
            onClick={() => inputRef.current?.click()}
            size="sm"
            variant="ghost"
            className="absolute right-0.5 top-0.5"
          >
            <SelectIcon className="size-5" />
          </Button>
        ) : (
          <Button
            size="icon"
            type="button"
            variant="ghost"
            className="absolute right-0.5 top-0.5"
            onClick={(e) => {
              copyToClipboard(fileResp);
              toast.info("Copied to clipboard");
              e.stopPropagation();
            }}
          >
            <ClipboardIcon size={14} />
          </Button>
        )}
      </div>
      <div className="flex  flex-row gap-2">
        {file && !fileResp && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={onFileUpload}
            // disabled={file === null || fileResp !== null}
          >
            <UploadIcon className="size-5" />
          </Button>
        )}
        {fileResp && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={onDeleteUpload}
          >
            <DeleteIcon className="size-5" />
          </Button>
        )}
      </div>
      {/* accept="image/png, image/jpeg" */}
      <Input
        id={id}
        type="file"
        onChange={onFileChange}
        {...restInputProps}
        className="hidden"
        ref={inputRef}
      />
    </div>
  );
};

export default FileUploader;
