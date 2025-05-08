import { saveAs } from "file-saver";
import { fetchEntityHierarchy, uploadEntityWithChildren } from "./actions";
import { ENTITY_DEFAULT_IMAGE_THUMBNAIL, LANGUAGES } from "@/lib/constants";
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

export const mapEntityToTileModel = (e: Entity | EntityWithRelations) => {
  const item: TileModel = {
    id: e.id,
    type: e.type as EntityTypeEnum,
    title: e.text,
    // subTitle: e.meaning,
    subTitle: e.type,
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
    const hierarchy = await fetchEntityHierarchy(entityId);

    if (!hierarchy) {
      throw new Error("Entity not found");
    }

    const blob = new Blob([JSON.stringify(hierarchy, null, 2)], {
      type: "application/json",
    });

    saveAs(blob, `entity_${entityId}_hierarchy.json`);
  } catch (error) {
    console.error("Failed to download entity hierarchy:", error);
  }
}

async function processEntityFile(file: File, parentId: string | null = null) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || !data.type) {
      throw new Error("Invalid file format");
    }
    await uploadEntityWithChildren(data, parentId);
    console.log("Entities created successfully");
  } catch (error) {
    console.error("Failed to process entity file:", error);
  }
}

export async function handleEntityFileUpload(
  e: React.ChangeEvent<HTMLInputElement>,
  parentId: string | null = null,
) {
  if (!e.target.files) return;
  if (e.target.files.length === 0) return;
  if (e.target.files.length > 1) {
    console.error("Please upload only one file");
    return;
  }
  if (e.target.files[0].type !== "application/json") {
    console.error("Please upload a JSON file");
    return;
  }
  const file = e.target.files[0];
  if (file) {
    await processEntityFile(file, parentId);
  }
}
