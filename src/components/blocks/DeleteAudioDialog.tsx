"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { deleteAudioForEntity } from "@/app/(app)/entities/actions";
import { usePurgeTrack } from "@/hooks/use-audio-queue";
import { useInvalidateEntities } from "@/hooks/use-entity-invalidation";

interface DeleteAudioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  /** The recording as the caller knows it, to find it in the play queue. */
  audioUrl?: string;
  onDeleted?: () => void;
}

/**
 * Asks before a verse's recording is deleted, then deletes it: the file, the
 * verse's `audio` field and the track in the play queue (stopping the player
 * if it was the one playing).
 */
export default function DeleteAudioDialog({
  open,
  onOpenChange,
  entityId,
  audioUrl,
  onDeleted,
}: DeleteAudioDialogProps) {
  const purgeTrack = usePurgeTrack();
  const invalidateEntities = useInvalidateEntities();

  const deletion = useMutation({
    mutationFn: async () => {
      const result = await deleteAudioForEntity(entityId);
      if (result.status === "error") throw new Error(result.error);
      return result.data.audio;
    },
    onSuccess: (removedUrl) => {
      purgeTrack(entityId, removedUrl || audioUrl);
      toast.success("Audio deleted");
      onOpenChange(false);
      onDeleted?.();
      // the verse has no audio any more: lists must pick that up
      invalidateEntities();
    },
    onError: (error) => {
      console.error("Audio deletion failed:", error);
      toast.error(error.message || "Could not delete the audio");
    },
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!deletion.isPending) onOpenChange(next);
      }}
    >
      {/* rendered in a portal, but clicks still bubble to the verse tile */}
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete audio recording?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the audio for this verse? The
            recording file will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletion.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            disabled={deletion.isPending}
            onClick={(e) => {
              // stays open until the deletion is through
              e.preventDefault();
              deletion.mutate();
            }}
          >
            {deletion.isPending ? "Deleting…" : "Delete Audio"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
