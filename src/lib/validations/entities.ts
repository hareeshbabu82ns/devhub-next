import { z } from "zod";
import { ENTITY_TYPES, LANGUAGES } from "../constants";
import { DICTIONARY_ORIGINS } from "@/app/(app)/dictionary/utils";

// based on EntityInput
export const EntityFormSchema = z.object({
  order: z.number().default(0).optional(),
  type: z.enum(ENTITY_TYPES),
  imageThumbnail: z.string().default("/default-om_256.png").optional(),
  audio: z.string().default("").optional(),
  bookmarked: z.boolean().default(false).optional(),
  text: z.array(
    z.object({
      language: z.enum(LANGUAGES),
      value: z.string(),
    }),
  ),
  meaning: z
    .array(
      z.object({
        language: z.enum(LANGUAGES),
        value: z.string(),
      }),
    )
    .optional(),
  attributes: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  notes: z.string().default("").optional(),
  childIDs: z
    .array(
      z.object({
        type: z.enum(ENTITY_TYPES),
        id: z.string(),
        imageThumbnail: z.string().optional(),
        text: z.string().optional(),
      }),
    )
    .optional(),
  parentIDs: z
    .array(
      z.object({
        type: z.enum(ENTITY_TYPES),
        id: z.string(),
        imageThumbnail: z.string().optional(),
        text: z.string().optional(),
      }),
    )
    .optional(),
});

export type EntityInputType = z.infer<typeof EntityFormSchema> & {
  children?: EntityInputType[];
  parents?: EntityInputType[];
};

export const EntityInputSchema: z.ZodType<EntityInputType> =
  EntityFormSchema.extend({
    children: z.lazy(() => EntityInputSchema.array().optional()),
    parents: z.lazy(() => EntityInputSchema.array().optional()),
  });

// based on DictItemInput
export const DictItemFormSchema = z.object({
  origin: z.enum(DICTIONARY_ORIGINS),
  word: z
    .array(
      z.object({
        language: z.enum(LANGUAGES),
        value: z.string(),
      }),
    )
    .min(1),
  description: z
    .array(
      z.object({
        language: z.enum(LANGUAGES),
        value: z.string(),
      }),
    )
    .min(1),
  attributes: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  phonetic: z.string().optional().default(""),
});

// Entity Upload Schema v1
const EntityUploadV1ParentTextSchema = z.object({
  id: z.string().optional(),
  type: z.enum(ENTITY_TYPES),
  text: z.string().optional(),
  textData: z
    .object({
      TEL: z
        .object({
          text: z.string(),
        })
        .optional(),
      SAN: z.object({
        text: z.string(),
      }),
      IAST: z
        .object({
          text: z.string(),
        })
        .optional(),
    })
    .optional(),
});
const EntityUploadV1TextSchema = z.object({
  type: z.enum(ENTITY_TYPES),
  text: z.string(),
  textData: z.object({
    TEL: z
      .object({
        text: z.string(),
      })
      .optional(),
    SAN: z.object({
      text: z.string(),
    }),
    IAST: z
      .object({
        text: z.string(),
      })
      .optional(),
  }),
});

const EntityUploadV1ContentsSchema = z.object({
  language: z.enum(LANGUAGES),
  title: z.string().optional(),
  category: z.string().optional(),
  source: z.string().optional(),
  contents: z.array(z.string()),
});

export const EntityUploadV1Schema = z.object({
  version: z.string().optional(),
  parent: EntityUploadV1ParentTextSchema.optional(),
  entity: EntityUploadV1TextSchema,
  contents: z.object({
    type: z.enum(ENTITY_TYPES),
    SAN: EntityUploadV1ContentsSchema.optional(),
    TEL: EntityUploadV1ContentsSchema.optional(),
    IAST: EntityUploadV1ContentsSchema.optional(),
  }),
});

export const EntityUploadCurrentSchema = z.object({
  version: z.string().optional(),
  entity: EntityInputSchema,
});
