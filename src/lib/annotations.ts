/**
 * Kinds of long-form writing that can be attached to an entity. Add an entry
 * here to get a new section (e.g. word-by-word, story, lecture notes) — no
 * schema change is needed because `EntityAnnotation.kind` is a plain string.
 */
export const ANNOTATION_KINDS = [
  {
    code: "COMMENTARY",
    label: "Commentary",
    plural: "Commentaries",
    titleLabel: "Commentator or source",
    /** Private kinds are visible only to the person who wrote them. */
    private: false,
  },
  {
    code: "THOUGHT",
    label: "Thought",
    plural: "My thoughts",
    titleLabel: "Heading (optional)",
    private: true,
  },
] as const;

export type AnnotationKind = (typeof ANNOTATION_KINDS)[number]["code"];

export const annotationKind = (code: string) =>
  ANNOTATION_KINDS.find((k) => k.code === code);

export type Annotation = {
  id: string;
  entityId: string;
  kind: string;
  language: string;
  title: string;
  text: string;
  order: number;
  mine: boolean;
  updatedAt: string;
};
