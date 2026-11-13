"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { DictionaryName } from "@/lib/dictionary/dictionary-constants";

/**
 * Sends a file as the raw request body with upload progress. Resolves with
 * the parsed JSON response, rejects with the server's error message.
 */
export function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (fraction: number) => void,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: any = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // not JSON
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body?.error || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

interface SqliteFileUploadProps {
  dictionary: DictionaryName;
  onUploadSuccess?: () => void;
  disabled?: boolean;
  /** "Replace file" when a file is already there */
  replace?: boolean;
}

export function SqliteFileUpload({
  dictionary,
  onUploadSuccess,
  disabled,
  replace,
}: SqliteFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.(sqlite3?|db)$/i.test(file.name)) {
      toast.error("Please choose a .sqlite file");
      return;
    }
    setProgress(0);
    try {
      const result = await uploadWithProgress(
        `/api/dictionary/upload?dictionary=${encodeURIComponent(dictionary)}`,
        file,
        setProgress,
      );
      toast.success(result?.message ?? `${dictionary.toUpperCase()} uploaded`);
      onUploadSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setProgress(null);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".sqlite,.sqlite3,.db"
        className="hidden"
        onChange={handleFile}
        aria-label={`SQLite file for ${dictionary.toUpperCase()}`}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9"
        disabled={disabled || progress !== null}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-4 mr-1.5" />
        {progress !== null
          ? `Uploading ${Math.round(progress * 100)}%`
          : replace
            ? "Replace file"
            : "Upload SQLite"}
      </Button>
    </>
  );
}
