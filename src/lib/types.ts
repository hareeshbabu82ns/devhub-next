import { EntityTypeCode } from "./entity-types";
import { buttonVariants } from "@/components/ui/button";
import { VariantProps } from "class-variance-authority";

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export type LanguageDDLB = {
  value: string;
  label: string;
};

// Derived from the registry in `./entity-types.ts`.
export type EntityTypeEnum = EntityTypeCode;

export type LanguageValueInput = {
  language: string;
  value: string;
};

export type AttributeValueInput = {
  key: string;
  value: string;
};

export type TypeEntityInput = string;
// export type TypeEntityInput = {
//   type: EntityTypeEnum;
//   entity: string;
// };

export type Entity = {
  id: string;
  type: EntityTypeEnum;
  imageThumbnail?: string;
  audio?: string;
  bookmarked?: boolean;
  text: string;
  textData?: LanguageValueInput[];
  meaning?: string;
  meaningData?: LanguageValueInput[];
  attributes?: AttributeValueInput[];
  notes?: string;
  order?: number;
};

export type EntityWithRelations = Entity & {
  parents?: EntityWithRelations[];
  parentsCount: number;
  children?: EntityWithRelations[];
  childrenCount: number;
  /** Ids of direct children; only set by `readEntity`. */
  childIds?: string[];
};

export type EntityInput = {
  type?: EntityTypeEnum;
  imageThumbnail?: string;
  audio?: string;
  bookmarked?: boolean;
  text?: LanguageValueInput[];
  meaning?: LanguageValueInput[];
  attributes?: AttributeValueInput[];
  notes?: string;
  children?: EntityInput[];
  childIDs?: TypeEntityInput[];
  parents?: EntityInput[];
  parentIDs?: TypeEntityInput[];
};

export type EntityType = {
  id: string;
  code: EntityTypeEnum;
  name: string;
  nameData?: LanguageValueInput[];
  description?: string;
};

export type EntityTypeInput = {
  code?: EntityTypeEnum;
  name?: LanguageValueInput[];
  description?: LanguageValueInput[];
};
