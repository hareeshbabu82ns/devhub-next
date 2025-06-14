import { saveAs } from "file-saver";
import { fetchEntityHierarchy, uploadEntityWithChildren } from "./actions";
import {
  ENTITY_DEFAULT_IMAGE_THUMBNAIL,
  ENTITY_TYPES_LANGUAGE_MAP,
  LANGUAGES,
} from "@/lib/constants";
import {
  Entity,
  EntityTypeEnum,
  EntityWithRelations,
  LanguageValueInput,
} from "@/lib/types";
import { TileModel } from "@/types/entities";

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
    subTitle: ENTITY_TYPES_LANGUAGE_MAP[e.type][lang] || e.type,
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
  item.text = (
    e.text.find((w: any) => w.language === language) || e.text[0]
  ).value;
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

export async function downloadEntityHierarchy(entityId: string) {
  try {
    // Use API route for download (better for large files)
    const response = await fetch(
      `/api/entities/download-zip?entityId=${encodeURIComponent(entityId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Download failed" }));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get("Content-Disposition");
    const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
    const filename = filenameMatch?.[1] || "entity_hierarchy.zip";

    // Get ZIP data as blob
    const blob = await response.blob();

    // Download the file
    saveAs(blob, filename);
  } catch (error) {
    console.error("Failed to download entity hierarchy:", error);
    throw error;
  }
}

async function processEntityFile(file: File, parentId: string | null = null) {
  try {
    if (file.type === "application/zip" || file.name.endsWith(".zip")) {
      // Handle ZIP file upload via API route (better for large files)
      const formData = new FormData();
      formData.append("file", file);
      if (parentId) {
        formData.append("parentId", parentId);
      }

      const response = await fetch("/api/entities/upload-zip", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "ZIP upload failed");
      }

      console.log(
        `ZIP uploaded successfully: ${result.data?.totalEntities} entities created`,
      );
    } else if (
      file.type === "application/json" ||
      file.name.endsWith(".json")
    ) {
      // Handle JSON file upload (legacy)
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || !data.type) {
        throw new Error("Invalid JSON file format");
      }
      await uploadEntityWithChildren(data, parentId);
      console.log("JSON entities created successfully");
    } else {
      throw new Error(
        "Unsupported file format. Please upload a ZIP or JSON file.",
      );
    }
  } catch (error) {
    console.error("Failed to process entity file:", error);
    throw error;
  }
}

export async function handleEntityFileUpload(
  e: React.ChangeEvent<HTMLInputElement>,
  parentId: string | null = null,
) {
  if (!e.target.files) return;
  if (e.target.files.length === 0) return;
  if (e.target.files.length > 1) {
    throw new Error("Please upload only one file");
  }

  const file = e.target.files[0];
  const isZip = file.type === "application/zip" || file.name.endsWith(".zip");
  const isJson =
    file.type === "application/json" || file.name.endsWith(".json");

  if (!isZip && !isJson) {
    throw new Error("Please upload a ZIP or JSON file");
  }

  if (file) {
    await processEntityFile(file, parentId);
  }
}
