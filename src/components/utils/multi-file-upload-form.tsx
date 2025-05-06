"use client";

import mime from "mime";
import { ChangeEvent, MouseEvent, useCallback, useState } from "react";
import { Button } from "../ui/button";
import { Icons } from "./icons";
import { toast } from "sonner";
import { FileUploadProps } from "@/types";
import { cn } from "@/lib/utils";
import Image from "next/image";

function getAcceptTypes(allowedTypes: string[]) {
  // return allowedTypes.map((t) => mime.getAllExtensions(t)).join(",");
  const exts: string[] = [];
  for (const type of allowedTypes) {
    mime.getAllExtensions(type)?.forEach((e) => exts.push(`.${e}`));
  }
  return exts.join(",");
}

const MultipleFileUploadForm = ({
  allowedTypes = ["all"],
  disabled = false,
  showPreviews = true,
  loading = false,
  label,
  basePath = "/",
  onUploadSuccess,
  onChangeFiles,
}: FileUploadProps) => {
  const [files, setFiles] = useState<File[] | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const acceptTypes = getAcceptTypes(allowedTypes);

  const onFilesUploadChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const fileInput = e.target;

      if (!fileInput.files) {
        // alert("No files were chosen");
        toast.error("No files were chosen!", {
          id: "file-upload-error",
        });
        return;
      }

      if (!fileInput.files || fileInput.files.length === 0) {
        // alert("Files list is empty");
        toast.error("Files list is empty!", {
          id: "file-upload-error",
        });
        return;
      }

      /** Files validation */
      const validFiles: File[] = [];
      for (let i = 0; i < fileInput.files.length; i++) {
        const file = fileInput.files[i];

        if (
          !allowedTypes.includes("all") &&
          allowedTypes.filter((t) => file.type.startsWith(t)).length === 0
        ) {
          // alert(`File with idx: ${i} is invalid`);
          toast.error(`File with idx: ${i} is invalid!`, {
            id: "file-upload-error",
          });
          return;
        }

        validFiles.push(file);
      }

      if (!validFiles.length) {
        // alert("No valid files were chosen");
        toast.error("No valid files were chosen!", {
          id: "file-upload-error",
        });
        return;
      }

      setFiles(validFiles);
      setPreviewUrls(
        validFiles
          // .filter((f) => f.type.startsWith("image"))
          .map((validFile) =>
            validFile.type.startsWith("image")
              ? URL.createObjectURL(validFile)
              : "/assets/file-generic.svg",
          ),
      );
      onChangeFiles?.(validFiles);

      /** Reset file input */
      fileInput.type = "text";
      fileInput.type = "file";
    },
    [allowedTypes, onChangeFiles],
  );

  const onCancelFile = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!previewUrls && !files) {
        return;
      }
      setFiles(null);
      setPreviewUrls([]);
      onChangeFiles?.([]);
    },
    [files, onChangeFiles, previewUrls],
  );

  const onUploadFile = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();

      if (!files) {
        return;
      }

      /** Uploading files to the server */
      try {
        const formData = new FormData();
        formData.append("basePath", basePath);
        files.forEach((file) => formData.append("media", file));

        const res = await fetch("/api/upload", {
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
        } = await res.json();

        if (error || !data) {
          // alert(error || "Sorry! something went wrong.");
          toast.error("Sorry! something went wrong.", {
            id: "file-upload-error",
          });
          return;
        }

        await onUploadSuccess?.(data.url);
        toast.success("Files were uploaded successfully!");
      } catch (error) {
        console.error(error);
        // alert("Sorry! something went wrong.");
        toast.error("Sorry! something went wrong.", {
          id: "file-upload-error",
        });
      }
    },
    [files, onUploadSuccess, basePath],
  );

  return (
    <form
      className="border-muted border border-dashed p-3 flex flex-1 overflow-y-auto justify-center"
      onSubmit={(e) => e.preventDefault()}
    >
      {files && files.length > 0 ? (
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex flex-row items-center justify-between">
            <Button
              disabled={!previewUrls || disabled}
              onClick={onCancelFile}
              size="icon"
              variant="outline"
            >
              <Icons.close className="size-4" />
            </Button>
            <p className="text-sm font-medium">{`${files?.length} files selected`}</p>
            <Button
              disabled={!previewUrls || disabled}
              onClick={onUploadFile}
              size="icon"
              variant="outline"
            >
              {loading ? (
                <Icons.loaderWheel className="text-muted size-14 animate-spin" />
              ) : (
                <Icons.upload className="size-4" />
              )}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {previewUrls.map((previewUrl, idx) => (
              <div
                key={idx}
                className="border border-dashed flex flex-col justify-between h-full p-2"
              >
                <div className="w-full object-cover rounded-md">
                  <Image
                    objectFit="cover"
                    alt="file uploader preview"
                    src={previewUrl}
                    width={300}
                    height={200}
                    loading="lazy"
                  />
                </div>
                <h5 className="text-sm font-medium text-center mt-4 w-full whitespace-nowrap overflow-hidden text-ellipsis">
                  {files[idx]?.name}
                </h5>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <label
          className={cn(
            "hover:text-muted-foreground flex h-full cursor-pointer flex-col items-center justify-center py-3 transition-colors duration-150",
            disabled && "cursor-default",
          )}
        >
          <Icons.upload className={cn("size-14", disabled && "text-muted")} />
          <strong
            className={cn("text-sm font-medium", disabled && "text-muted")}
          >
            {label || "Select Files"}
          </strong>
          <input
            disabled={disabled}
            className="hidden"
            name="file"
            type="file"
            onChange={onFilesUploadChange}
            multiple
            accept={acceptTypes}
          />
        </label>
      )}
    </form>
  );
};

export default MultipleFileUploadForm;
