import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AudioLines, Trash2 } from "lucide-react";
import { readEntity } from "@/app/(app)/entities/actions";
import { useLanguageAtomValue } from "@/hooks/use-config";
import { trackTitle } from "@/lib/audio/queue";
import { QUERY_STALE_TIME_LONG } from "@/lib/constants";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import AudioGenPlayPauseButton from "./AudioGenPlayPauseButton";
import AudioPlayPauseButton from "./AudioPlayPauseButton";
import DeleteAudioDialog from "./DeleteAudioDialog";
import GenerateAudioDialog from "./GenerateAudioDialog";

/**
 * Audio for a single verse known only by its id (the verse page): play it,
 * with regenerate / delete in the menu — or generate it when the verse has
 * no recording yet.
 */
export default function EntityAudioButton({
  entityId,
  parentId,
}: {
  entityId: string;
  /** The chapter, for "Play from here". */
  parentId?: string;
}) {
  const language = useLanguageAtomValue();
  const { data: entity } = useQuery({
    queryKey: ["entity", entityId, language],
    queryFn: () => readEntity(entityId, language),
    enabled: !!entityId,
    staleTime: QUERY_STALE_TIME_LONG,
  });
  const [audioDialogOpen, setAudioDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!entity) return null;

  const number = `${(entity.order ?? 0) + 1}`;
  const title = trackTitle(entity.text, `Verse ${number}`);
  return (
    <>
      {entity.audio ? (
        <AudioPlayPauseButton
          className="rounded-md border"
          track={{
            id: entity.id,
            src: entity.audio,
            title,
            subtitle: number,
            href: parentId
              ? `/entities/${parentId}/child/${entity.id}`
              : `/entities/${entity.id}`,
          }}
          contextId={parentId}
          menuExtra={
            <>
              <DropdownMenuItem onClick={() => setAudioDialogOpen(true)}>
                <AudioLines /> Modify &amp; Regenerate Audio...
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 /> Delete Audio
              </DropdownMenuItem>
            </>
          }
        />
      ) : (
        <AudioGenPlayPauseButton
          className="rounded-md border"
          title={title}
          onClick={() => setAudioDialogOpen(true)}
        />
      )}
      {/* mounted per opening: each one starts from the verse's text */}
      {audioDialogOpen && (
        <GenerateAudioDialog
          open
          onOpenChange={setAudioDialogOpen}
          entityId={entity.id}
          title={title}
          subtitle={number}
        />
      )}
      <DeleteAudioDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        entityId={entity.id}
        audioUrl={entity.audio}
      />
    </>
  );
}
