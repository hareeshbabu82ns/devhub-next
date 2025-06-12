"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { DictionaryName } from "@/lib/dictionary/dictionary-constants";

interface SqliteFileUploadProps {
  dictionary: DictionaryName;
  onUploadSuccess?: () => void;
  disabled?: boolean;
}

export function SqliteFileUpload({
  dictionary,
  onUploadSuccess,
  disabled,
}: SqliteFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file extension
    if (!file.name.endsWith(".sqlite")) {
      toast({
        title: "Invalid File",
        description: "Please select a .sqlite file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create form data for API upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dictionary", dictionary);

      const response = await fetch("/api/dictionary/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Upload Successful",
          description:
            result.message ||
            `SQLite file for ${dictionary.toUpperCase()} uploaded successfully`,
        });
        onUploadSuccess?.();
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset the input value to allow re-uploading the same file
      event.target.value = "";
    }
  };

  return (
    <div className="relative">
      <input
        type="file"
        accept=".sqlite"
        onChange={handleFileUpload}
        disabled={disabled || isUploading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        id={`sqlite-upload-${dictionary}`}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || isUploading}
        asChild
      >
        <label
          htmlFor={`sqlite-upload-${dictionary}`}
          className="cursor-pointer flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? "Uploading..." : "Upload SQLite"}
        </label>
      </Button>
    </div>
  );
}
