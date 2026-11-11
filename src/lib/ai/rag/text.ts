/**
 * Pure helpers for the knowledge index: text preparation, concept keys,
 * vector quantisation and the reply parser for the extraction step.
 * No database, network or Node-only access, so this file is shared with the
 * browser and everything here is unit-tested.
 */

/** `AskSource.type` of a knowledge-graph concept (its `id` is the concept key). */
export const CONCEPT_SOURCE_TYPE = "CONCEPT";

/** Diacritic-insensitive ASCII folding: "Niṣkāma Karma" → "nishkama karma". */
export const fold = (value: string) =>
  value
    .toLowerCase()
    .replace(/[ṣś]/g, "sh")
    .replace(/ṛ/g, "ri")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`]/g, "");

export const CONCEPT_KINDS = [
  "character",
  "concept",
  "place",
  "state",
  "event",
] as const;
export type ConceptKind = (typeof CONCEPT_KINDS)[number];

export const CONCEPT_KIND_LABEL: Record<ConceptKind, string> = {
  character: "Character",
  concept: "Concept",
  place: "Place",
  state: "State of mind",
  event: "Event",
};

const KIND_ALIASES: Record<string, ConceptKind> = {
  person: "character",
  deity: "character",
  god: "character",
  sage: "character",
  people: "character",
  idea: "concept",
  teaching: "concept",
  theme: "concept",
  practice: "concept",
  object: "concept",
  location: "place",
  river: "place",
  mountain: "place",
  city: "place",
  emotion: "state",
  feeling: "state",
  mood: "state",
};

export const conceptKind = (raw: unknown): ConceptKind | null => {
  const kind = String(raw ?? "")
    .toLowerCase()
    .trim();
  if ((CONCEPT_KINDS as readonly string[]).includes(kind)) {
    return kind as ConceptKind;
  }
  return KIND_ALIASES[kind] ?? null;
};

const HONORIFICS =
  /^(sri|shri|shree|lord|goddess|god|king|queen|sage|rishi|maharshi|maharishi|prince|princess|saint|swami|bhagavan|bhagawan|devi|the)\s+/;

/** Slug shared by every spelling of a name: "Śrī Rāma" and "Lord Rama" → "rama". */
export const conceptSlug = (name: string) => {
  let slug = fold(name)
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  // strip stacked honorifics, but never the whole name
  for (let i = 0; i < 3; i++) {
    const next = slug.replace(HONORIFICS, "");
    if (next === slug || !next) break;
    slug = next;
  }
  return slug.replace(/\s+/g, "-").slice(0, 60);
};

export const conceptKey = (kind: ConceptKind, name: string) => {
  const slug = conceptSlug(name);
  return slug ? `${kind}:${slug}` : "";
};

export const conceptKindOf = (key: string) =>
  conceptKind(key.split(":")[0]) ?? "concept";

/** Markdown and layout noise removed, whitespace collapsed. */
export const plainText = (value: string) =>
  value
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[*_#>`]+/g, " ")
    .replace(/^-{3,}$/gm, " ")
    .replace(/\s+/g, " ")
    .trim();

const clip = (value: string, max: number) =>
  value.length > max ? value.slice(0, max) : value;

/**
 * The text an entity is embedded as: where it sits, its meaning, then the
 * original verse. Meaning comes first because embedding models cut off long
 * inputs, and it is what questions in everyday language are closest to.
 */
export const chunkText = (parts: {
  reference: string;
  text: string;
  meaning: string;
}) =>
  [
    parts.reference,
    clip(plainText(parts.meaning), 900),
    clip(plainText(parts.text), 500),
  ]
    .filter(Boolean)
    .join("\n");

/** A passage as the extraction model reads it: the verse, then its meaning. */
export const passageText = (parts: { text: string; meaning: string }) =>
  [clip(plainText(parts.text), 400), clip(plainText(parts.meaning), 600)]
    .filter(Boolean)
    .join("\n");

/** Unit vector → one signed byte per dimension (cosine order is preserved). */
export const quantize = (vector: number[], dimensions?: number): Int8Array => {
  const cut =
    dimensions && dimensions < vector.length
      ? vector.slice(0, dimensions)
      : vector;
  // re-normalise: a truncated (Matryoshka) vector is no longer unit length
  let norm = 0;
  for (const x of cut) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  const out = new Int8Array(cut.length);
  for (let i = 0; i < cut.length; i++) {
    out[i] = Math.max(-127, Math.min(127, Math.round((cut[i] / norm) * 127)));
  }
  return out;
};

/** The bytes of a quantised vector, copied into their own buffer for storage. */
export const toBytes = (vector: Int8Array): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(
    new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength),
  );

export const fromBytes = (bytes: Uint8Array) =>
  new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);

export type VectorHit = { index: number; score: number };

/**
 * The `limit` rows of a row-major int8 matrix closest to `query` by cosine
 * similarity. Rows are quantised unit vectors, so the dot product divided by
 * 127² is the similarity.
 */
export const topMatches = (
  matrix: Int8Array,
  dim: number,
  query: Int8Array,
  limit: number,
  minScore = 0,
): VectorHit[] => {
  const rows = dim > 0 ? Math.floor(matrix.length / dim) : 0;
  if (rows === 0 || query.length !== dim) return [];
  const best: VectorHit[] = [];
  let floor = minScore;
  for (let r = 0; r < rows; r++) {
    let dot = 0;
    const offset = r * dim;
    for (let i = 0; i < dim; i++) dot += matrix[offset + i] * query[i];
    const score = dot / 16129;
    if (score <= floor) continue;
    // insertion into a short sorted list beats sorting every row
    let at = best.length;
    while (at > 0 && best[at - 1].score < score) at--;
    best.splice(at, 0, { index: r, score });
    if (best.length > limit) {
      best.pop();
      floor = best[best.length - 1].score;
    }
  }
  return best;
};

export const MENTION_RELATIONS = [
  "MENTIONS",
  "DEFINES",
  "SPOKEN_BY",
  "ADDRESSES",
  "DEPICTS",
] as const;
export type MentionRelation = (typeof MENTION_RELATIONS)[number];

/** How strongly a relation carries relevance from one end to the other. */
export const RELATION_WEIGHT: Record<string, number> = {
  DEFINES: 1,
  DEPICTS: 0.85,
  MENTIONS: 0.55,
  // who speaks to whom frames a passage but says little about its subject
  ADDRESSES: 0.25,
  SPOKEN_BY: 0.25,
  RELATED: 0.5,
  NEXT: 0.25,
};

export const RELATION_VERB: Record<string, string> = {
  DEFINES: "teaches",
  DEPICTS: "depicts",
  ADDRESSES: "is addressed to",
  MENTIONS: "mentions",
  SPOKEN_BY: "is spoken by",
};

export type ExtractedConcept = {
  key: string;
  kind: ConceptKind;
  label: string;
  original: string;
  description: string;
};
export type ExtractedMention = {
  key: string;
  rel: MentionRelation;
  why: string;
};
export type ExtractedRelation = {
  from: string;
  to: string;
  label: string;
  why: string;
  /** index of the passage the relation was read from, when the model says */
  passage: number | null;
};
export type Extraction = {
  concepts: ExtractedConcept[];
  /** passage number (1-based, as shown to the model) → what it mentions */
  mentions: Map<number, ExtractedMention[]>;
  relations: ExtractedRelation[];
};

const str = (value: unknown, max: number) =>
  typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";

/** The first balanced `{...}` in a model reply, whatever surrounds it. */
export const firstJsonObject = (reply: string): unknown => {
  const start = reply.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < reply.length; i++) {
    const c = reply[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(reply.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
};

/**
 * Reads the extraction step's reply. Everything the model returns is treated
 * as untrusted: unknown kinds, names that do not resolve, passage numbers out
 * of range and relations to undeclared names are all dropped.
 */
export const parseExtraction = (
  reply: string,
  passageCount: number,
): Extraction => {
  const result: Extraction = {
    concepts: [],
    mentions: new Map(),
    relations: [],
  };
  const json = firstJsonObject(reply.replace(/<think>[\s\S]*?<\/think>/g, ""));
  if (!json || typeof json !== "object") return result;
  const root = json as Record<string, unknown>;

  // name as the model wrote it → key
  const byName = new Map<string, string>();
  const seen = new Set<string>();
  for (const raw of Array.isArray(root.entities) ? root.entities : []) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const label = str(item.name, 60);
    const kind = conceptKind(item.kind);
    if (!label || !kind) continue;
    const key = conceptKey(kind, label);
    if (!key) continue;
    byName.set(fold(label), key);
    if (seen.has(key)) continue;
    seen.add(key);
    result.concepts.push({
      key,
      kind,
      label,
      original: str(item.original, 60),
      description: str(item.description, 240),
    });
  }
  const resolve = (name: unknown) =>
    typeof name === "string" ? (byName.get(fold(name.trim())) ?? "") : "";

  for (const raw of Array.isArray(root.passages) ? root.passages : []) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const n = Number(item.n);
    if (!Number.isInteger(n) || n < 1 || n > passageCount) continue;
    const list = result.mentions.get(n) ?? [];
    for (const m of Array.isArray(item.mentions) ? item.mentions : []) {
      if (!m || typeof m !== "object") continue;
      const mention = m as Record<string, unknown>;
      const key = resolve(mention.name);
      if (!key || list.some((x) => x.key === key)) continue;
      const rel = String(mention.rel ?? "").toUpperCase();
      list.push({
        key,
        rel: (MENTION_RELATIONS as readonly string[]).includes(rel)
          ? (rel as MentionRelation)
          : "MENTIONS",
        why: str(mention.why, 160),
      });
    }
    if (list.length > 0) result.mentions.set(n, list.slice(0, 8));
  }

  for (const raw of Array.isArray(root.relations) ? root.relations : []) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const from = resolve(item.from);
    const to = resolve(item.to);
    const label = str(item.label, 40).toLowerCase();
    if (!from || !to || from === to || !label) continue;
    const n = Number(item.n);
    result.relations.push({
      from,
      to,
      label,
      why: str(item.why, 160),
      passage: Number.isInteger(n) && n >= 1 && n <= passageCount ? n : null,
    });
  }
  return result;
};
