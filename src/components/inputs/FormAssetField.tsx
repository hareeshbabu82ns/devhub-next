"use client";

import { useRef, useState } from "react";
import { Control, useController } from "react-hook-form";
import { FolderSearch, Loader2, Pause, Play, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import AssetPickerDialog from "@/components/assets/AssetPickerDialog";
import { AssetKindIcon } from "@/components/assets/asset-icons";
import { uploadAsset } from "@/components/assets/use-asset-upload";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  AssetKind,
  acceptAttribute,
  assetKindFromName,
  assetPathFromUrl,
  cleanAssetUrl,
  isAssetUrl,
  parentAssetPath,
} from "@/lib/assets/shared";
import { cn } from "@/lib/utils";

interface FormAssetFieldProps {
  control: Control<any>;
  name: string;
  label: string;
  description?: string;
  /** what the field holds; decides the preview and what can be chosen */
  kind: Extract<AssetKind, "image" | "audio">;
  /** folder for direct uploads when the field has no asset yet */
  uploadFolder: string;
  /** value after "Clear" (e.g. the default thumbnail) */
  emptyValue?: string;
  className?: string;
}

/** Small preview of whatever the field points at. */
function FieldPreview({ kind, value }: { kind: "image" | "audio"; value: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const broken = failed === value;

  if (kind === "image") {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
        {value && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={isAssetUrl(value) ? `${cleanAssetUrl(value)}?w=96` : value}
            alt=""
            className="size-full object-cover"
            onError={() => setFailed(value)}
          />
        ) : (
          <AssetKindIcon kind="image" className="size-5 text-muted-foreground" />
        )}
      </span>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        disabled={!value || broken}
        aria-label={playing ? "Pause audio" : "Play audio"}
        title={broken ? "This audio could not be loaded" : undefined}
        onClick={() => {
          const el = audioRef.current;
          if (!el) return;
          if (el.paused) el.play().catch(() => setFailed(value));
          else el.pause();
        }}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      {value && (
        <audio
          key={value}
          ref={audioRef}
          src={cleanAssetUrl(value)}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => {
            setPlaying(false);
            setFailed(value);
          }}
        />
      )}
    </>
  );
}

/**
 * Form field for an image or audio URL: shows what is set, lets the user
 * browse the asset library, upload a new file straight into the field, type
 * an external URL, or clear it.
 */
export default function FormAssetField({
  control,
  name,
  label,
  description,
  kind,
  uploadFolder,
  emptyValue = "",
  className,
}: FormAssetFieldProps) {
  const { field } = useController({ control, name });
  const value: string = field.value ?? "";
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const setValue = (next: string) => field.onChange(next);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (assetKindFromName(file.name) !== kind) {
      toast.error(`Choose ${kind === "image" ? "an image" : "an audio"} file`);
      return;
    }
    // keep related files together: upload next to the current asset
    const current = assetPathFromUrl(value);
    const folder = current !== null ? parentAssetPath(current) : uploadFolder;
    setProgress(0);
    try {
      const item = await uploadAsset(file, folder, { onProgress: setProgress });
      setValue(item.url);
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast.success(`Uploaded to /${folder}`);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setProgress(null);
    }
  };

  return (
    <FormField
      control={control}
      name={name}
      render={() => (
        <FormItem className={cn("min-w-0", className)}>
          <FormLabel>{label}</FormLabel>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-48 flex-1 items-center gap-2">
              <FieldPreview kind={kind} value={value} />
              <FormControl>
                <Input
                  {...field}
                  value={value}
                  placeholder={`${label} URL`}
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="min-w-0 flex-1"
                />
              </FormControl>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPickerOpen(true)}
              >
                <FolderSearch /> Browse
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={progress !== null}
                onClick={() => fileRef.current?.click()}
              >
                {progress !== null ? (
                  <>
                    <Loader2 className="animate-spin" /> {progress}%
                  </>
                ) : (
                  <>
                    <Upload /> Upload
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={value === emptyValue}
                onClick={() => setValue(emptyValue)}
                aria-label={`Clear ${label.toLowerCase()}`}
                title={emptyValue ? "Reset to default" : "Clear"}
              >
                <X />
              </Button>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept={acceptAttribute([kind])}
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
          <AssetPickerDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            title={`Choose ${label.toLowerCase()}`}
            accept={[kind]}
            value={value}
            defaultFolder=""
            onSelect={(item) => setValue(item.url)}
          />
        </FormItem>
      )}
    />
  );
}
