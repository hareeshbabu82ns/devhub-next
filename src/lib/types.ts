export type LanguageDDLB = {
  value: string;
  label: string;
};

export enum EntityTypeEnum {
  GOD = "GOD",
  AUTHOR = "AUTHOR",
  ITIHASAM = "ITIHASAM",
  PURANAM = "PURANAM",
  STHOTRAM = "STHOTRAM",
  DANDAKAM = "DANDAKAM",
  KAANDAM = "KAANDAM",
  SARGA = "SARGA",
  PARVAM = "PARVAM",
  ADHYAAYAM = "ADHYAAYAM",
  SLOKAM = "SLOKAM",
  OTHERS = "OTHERS",
  SKANDAM = "SKANDAM",
  GHATTAM = "GHATTAM",
}

export type LanguageValueInput = {
  language: string;
  value: string;
};

export type AttributeValueInput = {
  key: string;
  value: string;
};

export type TypeEntityInput = {
  type: EntityTypeEnum;
  entity: string;
};

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
};

export type EntityWithRelations = Entity & {
  parents?: EntityWithRelations[];
  parentsCount: number;
  children?: EntityWithRelations[];
  childrenCount: number;
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
