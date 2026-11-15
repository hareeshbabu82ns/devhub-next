/**
 * Shapes and formatting of what "Fill with AI" produces. Kept free of
 * server-only imports: the review dialog in the browser uses these too.
 */

import { firstJsonObject } from "./rag/text";

export type WebSource = { url: string; title: string };

export const FILL_TASKS = ["meaning", "words", "schools"] as const;
export type FillTask = (typeof FILL_TASKS)[number];

export type WordMeaning = {
  word: string;
  transliteration: string;
  meaning: string;
};

export type SchoolExplanation = {
  school: string;
  commentator: string;
  /** markdown */
  text: string;
  sources: WebSource[];
};

export type FillResult = {
  /** "OpenAI · gpt-4o": who wrote this */
  model: string;
  meaning?: string;
  words?: WordMeaning[];
  schools?: SchoolExplanation[];
  /** what could not be produced, by task */
  errors: Partial<Record<FillTask, string>>;
};

/** Marks titles of annotations the AI wrote, so a re-run can find them. */
export const AI_TITLE_MARK = "AI";
export const isAiTitle = (title: string | null | undefined) =>
  /(^|[^\p{L}])AI([^\p{L}]|$)/u.test(title ?? "");

const str = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/** Reads the reply of the translation step; anything unusable is dropped. */
export const parseTranslation = (
  reply: string,
): { meaning: string; words: WordMeaning[] } => {
  const json = firstJsonObject(reply) as {
    meaning?: unknown;
    words?: unknown;
  } | null;
  const words = Array.isArray(json?.words)
    ? json.words
        .map((w): WordMeaning => {
          const item = (w ?? {}) as Record<string, unknown>;
          return {
            word: str(item.word, 200),
            transliteration: str(item.transliteration, 200),
            meaning: str(item.meaning, 600),
          };
        })
        .filter((w) => w.word && w.meaning)
        .slice(0, 200)
    : [];
  return { meaning: str(json?.meaning, 6000), words };
};

/** One markdown line per word: **word** (transliteration) — meaning. */
export const wordsToMarkdown = (words: WordMeaning[]) =>
  words
    .map(
      (w) =>
        `- **${w.word}**${w.transliteration && w.transliteration !== w.word ? ` (${w.transliteration})` : ""} — ${w.meaning}`,
    )
    .join("\n");

/** The annotation a school's explanation is saved as. */
export const schoolAnnotation = (e: SchoolExplanation) => ({
  title: `${e.school}${e.commentator ? ` — ${e.commentator}` : ""} · ${AI_TITLE_MARK} web summary`,
  text: `${e.text}\n\n**Sources**\n${e.sources
    .map((s) => `- [${s.title.replace(/[[\]]/g, "")}](${s.url})`)
    .join("\n")}`,
});

export const wordsAnnotationTitle = (model: string) =>
  `${AI_TITLE_MARK} · ${model}`;
