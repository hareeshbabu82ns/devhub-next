import { useQuery } from "@tanstack/react-query";
import { readEntity } from "@/app/(app)/entities/actions";
import { useLanguageAtomValue } from "@/hooks/use-config";
import { trackTitle } from "@/lib/audio/queue";
import { QUERY_STALE_TIME_LONG } from "@/lib/constants";
import AudioPlayPauseButton from "./AudioPlayPauseButton";

/**
 * Play button for a single verse known only by its id (the verse page).
 * Shows nothing when the verse has no recording.
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

  if (!entity?.audio) return null;

  const number = `${(entity.order ?? 0) + 1}`;
  return (
    <AudioPlayPauseButton
      className="rounded-md border"
      track={{
        id: entity.id,
        src: entity.audio,
        title: trackTitle(entity.text, `Verse ${number}`),
        subtitle: number,
        href: parentId
          ? `/entities/${parentId}/child/${entity.id}`
          : `/entities/${entity.id}`,
      }}
      contextId={parentId}
    />
  );
}
