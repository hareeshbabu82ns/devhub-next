"use client";

import Image from "next/image";
import mime from "mime";
import { ChangeEvent, MouseEvent, useState } from "react";
import { Button } from "../ui/button";
import { Icons } from "./icons";
import { FileUploadProps } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function getAcceptTypes(allowedTypes: string[]) {
  // return allowedTypes.map((t) => mime.getAllExtensions(t)).join(",");
  const exts: string[] = [];
  for (const type of allowedTypes) {
    mime.getAllExtensions(type)?.forEach((e) => exts.push(`.${e}`));
  }
  return exts.join(",");
}

const SingleFileUploadForm = ({
  allowedTypes = ["all"],
  disabled = false,
  showPreviews = true,
  label,
  loading = false,
  onUploadSuccess,
  onChangeFiles,
}: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const acceptTypes = getAcceptTypes(allowedTypes);

  const onFileUploadChange = (e: ChangeEvent<HTMLInputElement>) => {
    const fileInput = e.target;

    if (!fileInput.files) {
      // alert("No file was chosen");
      toast.error("No file was chosen!", { id: "file-upload-error" });
      return;
    }

    if (!fileInput.files || fileInput.files.length === 0) {
      // alert("Files list is empty");
      toast.error("Files list is empty!", { id: "file-upload-error" });
      return;
    }

    const file = fileInput.files[0];

    /** File validation */
    if (
      !allowedTypes.includes("all") &&
      allowedTypes.filter((t) => file.type.startsWith(t)).length === 0
    ) {
      // alert("Please select a valid file type");
      toast.error("Please select a valid file type!", {
        id: "file-upload-error",
      });
      return;
    }

    /** Setting file state */
    setFile(file);
    setPreviewUrl(
      file.type.startsWith("image")
        ? URL.createObjectURL(file)
        : "/assets/file-generic.svg",
    );
    onChangeFiles && onChangeFiles([file]);

    /** Reset file input */
    e.currentTarget.type = "text";
    e.currentTarget.type = "file";
  };

  const onCancelFile = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!previewUrl && !file) {
      return;
    }
    setFile(null);
    setPreviewUrl(null);
    onChangeFiles && onChangeFiles([]);
  };

  const onUploadFile = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!file) {
      return;
    }

    try {
      var formData = new FormData();
      formData.append("media", file);

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
        toast.error("File upload failed!", { id: "file-upload-error" });
        return;
      }

      onUploadSuccess && (await onUploadSuccess(data.url));
      // console.log("File was uploaded successfylly:", data);
    } catch (error) {
      // console.error(error);
      // alert("Sorry! something went wrong.");
      toast.error("File upload failed!", { id: "file-upload-error" });
    }
  };

  return (
    <form
      className="border-muted w-full border border-dashed p-3"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="flex flex-col gap-1.5 md:flex-row md:py-4">
        <div className="flex grow items-center justify-center">
          {showPreviews && previewUrl && (
            <div className="mx-auto w-80 space-y-1">
              <Image
                alt="file uploader preview"
                objectFit="cover"
                src={previewUrl}
                width={320}
                height={218}
                layout="fixed"
              />
              <p className="text-muted-foreground text-center text-xs">
                {file?.name}
              </p>
            </div>
          )}
          {!showPreviews && file && (
            <div className="mx-auto w-80">
              <p className="text-center">{file?.name}</p>
            </div>
          )}
          {!previewUrl && (
            <label
              className={cn(
                "hover:text-muted-foreground flex h-full cursor-pointer flex-col items-center justify-center py-3 transition-colors duration-150",
                disabled && "cursor-default",
              )}
            >
              <Icons.upload
                className={cn("size-14", disabled && "text-muted")}
              />

              <strong
                className={cn("text-sm font-medium", disabled && "text-muted")}
              >
                {label || "Select a File"}
              </strong>
              <input
                disabled={disabled}
                className="hidden"
                name="file"
                type="file"
                onChange={onFileUploadChange}
                accept={acceptTypes}
              />
            </label>
          )}
        </div>
        <div className="mt-4 flex justify-center gap-1.5 md:mt-0 md:flex-col">
          <Button
            disabled={!previewUrl || disabled}
            onClick={onCancelFile}
            size="icon"
            variant="outline"
          >
            <Icons.close className="size-4" />
          </Button>
          <Button
            disabled={!previewUrl || disabled}
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
      </div>
    </form>
  );
};

export default SingleFileUploadForm;
