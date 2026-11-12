import {
  ENTITY_DEFAULT_IMAGE_THUMBNAIL,
  LANGUAGES,
} from "@/lib/constants";
import {
  Entity,
  EntityTypeEnum,
  EntityWithRelations,
  LanguageValueInput,
} from "@/lib/types";
import { TileModel } from "@/types/entities";
import { entityTypeName } from "@/lib/entity-types";

export const entityLanguageValueTransliterateHelper = (
  textData: LanguageValueInput[],
) => {
  const tmpTextData = textData?.map((t) => {
    return {
      value: t.value
        ? t.value
        : `$transliterateFrom=${LANGUAGES.filter((l) => l !== t.language && l !== "ENG").join("|")}`,
      language: t.language,
    };
  });
  for (const lang of ["IAST", "SLP1", "ITRANS"]) {
    const langIndex = tmpTextData.findIndex((t) => t.language === lang);
    if (langIndex === -1) {
      tmpTextData.push({
        value: `$transliterateFrom=${LANGUAGES.filter((l) => l !== lang && l !== "ENG").join("|")}`,
        language: lang,
      });
    }
  }
  // console.log("textData", tmpTextData);
  return tmpTextData;
};

export const mapTileModelToEntity = (t: TileModel) => {
  const item: Entity = {
    id: t.id,
    type: (t.type as EntityTypeEnum) || (t.subTitle as EntityTypeEnum),
    imageThumbnail: t.src,
    audio: t.audio || "",
    text: t.title,
    // meaning: t.subTitle,
    bookmarked: t.bookmarked,
  };
  return item;
};

export const mapEntityToTileModel = (
  e: Entity | EntityWithRelations,
  lang: string,
) => {
  const item: TileModel = {
    id: e.id,
    type: e.type as EntityTypeEnum,
    title: e.text,
    // subTitle: e.meaning,
    subTitle: entityTypeName(e.type, lang),
    src: e.imageThumbnail || ENTITY_DEFAULT_IMAGE_THUMBNAIL,
    audio: e.audio,
    order: e.order,
    bookmarked: e.bookmarked,
    childrenCount: isEntityWithRelations(e) ? e.childrenCount : 0,
  };
  return item;
};

const isEntityWithRelations = (
  e: Entity | EntityWithRelations,
): e is EntityWithRelations => {
  return (e as EntityWithRelations).childrenCount !== undefined;
};

export const flattenEntityParents = (e: EntityWithRelations) => {
  const parents: EntityWithRelations[] = [];
  let parent = e;
  while (parent.parents?.length) {
    parent = parent.parents[0];
    parents.push(parent);
  }
  return parents.reverse();
};

export const mapDbToEntity = (e: any, language: string, meaning?: string) => {
  const item: EntityWithRelations = {
    id: e.id,
    type: e.type as any,
    imageThumbnail: e.imageThumbnail || ENTITY_DEFAULT_IMAGE_THUMBNAIL,
    audio: e.audio || "",
    text: "",
    meaning: "",
    attributes: e.attributes,
    textData: e.text,
    meaningData: e.meaning,
    childrenCount: e.children?.length,
    parentsCount: e.parents?.length,
    order: e.order,
    notes: e.notes,
    bookmarked: e.bookmarked,
  };
  // an entity without any text must not take the whole list down with it
  item.text =
    (e.text?.find((w: any) => w.language === language) || e.text?.[0])
      ?.value ?? "";
  const meaningLang = meaning || language;
  item.meaning = e.meaning
    ? e.meaning.length === 0
      ? ""
      : (e.meaning.find((w: any) => w.language === meaningLang) || e.meaning[0])
          .value
    : "";
  item.children = e.childrenRel?.map((p: any) =>
    mapDbToEntity(p, language, meaning),
  );
  item.parents = e.parentsRel?.map((p: any) =>
    mapDbToEntity(p, language, meaning),
  );
  return item;
};

export interface EntityImportResult {
  entityId: string;
  totalEntities: number;
  totalAnnotations: number;
  totalPlaygrounds: number;
  warnings: string[];
}

/**
 * Imports a downloaded archive (ZIP) or a JSON tree under `parentId`. The
 * server validates the whole file first and either imports everything or
 * nothing.
 */
export async function importEntityFile(
  file: File,
  parentId: string | null = null,
): Promise<EntityImportResult> {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".zip") && !name.endsWith(".json")) {
    throw new Error("Please upload a ZIP or JSON file");
  }
  const formData = new FormData();
  formData.append("file", file);
  if (parentId) formData.append("parentId", parentId);

  const response = await fetch("/api/entities/upload-zip", {
    method: "POST",
    body: formData,
  });
  const result = await response
    .json()
    .catch(() => ({ success: false, error: `HTTP ${response.status}` }));
  if (!result.success) throw new Error(result.error || "Upload failed");
  return result.data as EntityImportResult;
}

export async function handleEntityFileUpload(
  e: React.ChangeEvent<HTMLInputElement>,
  parentId: string | null = null,
): Promise<EntityImportResult | undefined> {
  const input = e.target;
  const files = input.files;
  if (!files || files.length === 0) return;
  if (files.length > 1) throw new Error("Please upload only one file");
  try {
    return await importEntityFile(files[0], parentId);
  } finally {
    // allow choosing the same file again (e.g. after fixing it)
    input.value = "";
  }
}

/** Toast text for a finished import. */
export function describeEntityImport(result?: EntityImportResult) {
  if (!result) return "Nothing uploaded";
  const parts = [`${result.totalEntities} entities`];
  if (result.totalAnnotations)
    parts.push(`${result.totalAnnotations} annotations`);
  if (result.totalPlaygrounds)
    parts.push(`${result.totalPlaygrounds} playgrounds`);
  const summary = `Imported ${parts.join(", ")}`;
  return result.warnings.length
    ? `${summary}. Notes: ${result.warnings.join("; ")}`
    : summary;
}

export async function callTTSApi({
  text,
  voiceKey = "PAN_F_HAPPY_00001",
}: {
  text: string;
  voiceKey?: string;
}): Promise<string | null> {
  try {
    if (!process.env.TTS_UTILS_URL) {
      throw new Error("TTS_UTILS_URL environment variable is not set");
    }
    if (!text || typeof text !== "string") {
      throw new Error("Invalid text input for TTS conversion");
    }
    if (!voiceKey || typeof voiceKey !== "string") {
      throw new Error("Invalid voice key for TTS conversion");
    }
    // process text to remove extra characters and trim whitespace
    text = text
      .replace(/\s+/g, " ")
      .replace(/[।]/g, " , ")
      .replace(/[॥]/g, " . ")
      .trim();
    if (text.length === 0) {
      throw new Error("Text input cannot be empty for TTS conversion");
    }

    const response = await fetch(`${process.env.TTS_UTILS_URL}/tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        reference_voice_key: voiceKey,
        save_to_file: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "TTS API request failed");
    }

    const data = await response.json();
    return data.audio_base64 || null;
  } catch (error) {
    console.error("Failed to call TTS API:", error);
    throw error;
  }
}
