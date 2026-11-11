import { AiConfig } from "./config";
import { chatComplete, ChatMessage, chatStream } from "./client";
import { Passage, resolveScope, searchPassages } from "./retrieval";

export type AskSource = {
  n: number;
  id: string;
  type: string;
  parentId: string | null;
  reference: string;
};

export type AskEvent =
  | { type: "sources"; sources: AskSource[]; scope: string; mode: string }
  | { type: "delta"; text: string }
  | { type: "error"; error: string }
  | { type: "done" };

export type AskInput = {
  question: string;
  /** Book, chapter or verse to stay within; null for the whole library. */
  scopeId: string | null;
  history?: { role: "user" | "assistant"; content: string }[];
};

const STOP_WORDS = new Set(
  "the a an and or of in on to for is are was were be what who whom whose when where why how which does do did with from about this that these those it its as at by tell me explain meaning verse chapter book".split(
    " ",
  ),
);

/** Keywords straight from the question, used when the model cannot help. */
export const naiveKeywords = (question: string) =>
  [
    ...new Set(
      question
        .split(/[^\p{L}\p{M}\p{N}]+/u)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase())),
    ),
  ].slice(0, 6);

/** Pulls a JSON array of strings out of a model reply, however it is wrapped. */
export const parseKeywordReply = (reply: string): string[] => {
  const match = reply.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed)
      ? parsed.filter((k): k is string => typeof k === "string")
      : [];
  } catch {
    return [];
  }
};

/**
 * The library is mostly Sanskrit with partial English meanings, while the
 * question may be in any language — so the model first turns the question
 * into search terms in the scripts the texts are stored in.
 */
async function searchKeywords(
  config: AiConfig,
  question: string,
  signal?: AbortSignal,
): Promise<string[]> {
  try {
    const reply = await chatComplete(
      config,
      [
        {
          role: "system",
          content:
            "You prepare search terms for a library of Hindu devotional texts stored in Sanskrit (Devanagari and IAST), Telugu, and partly translated to English. Given a question, reply with ONLY a JSON array of at most 6 short search terms likely to appear verbatim in relevant verses or their translations: key names and concepts in English, in IAST and in Devanagari. No explanation.",
        },
        { role: "user", content: question },
      ],
      signal,
    );
    const keywords = parseKeywordReply(reply);
    if (keywords.length > 0) return keywords;
  } catch (error) {
    if (signal?.aborted) throw error;
    console.warn("AI keyword step failed, using the question's own words");
  }
  return naiveKeywords(question);
}

export const formatPassages = (passages: Passage[]) =>
  passages
    .map((p, i) =>
      [
        `[${i + 1}] ${p.reference}`,
        p.text,
        p.meaning && `Meaning: ${p.meaning}`,
        ...p.notes,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

const SYSTEM_PROMPT = `You answer questions about a personal library of Hindu devotional and scriptural texts.
Use ONLY the numbered passages provided. Cite the passages you rely on with their numbers in square brackets, like [3].
If the passages do not contain the answer, say so plainly instead of answering from general knowledge.
Quote Sanskrit sparingly and explain it. Reply in the language of the question.`;

/** Answers a question from the library, yielding sources first, then text. */
export async function* askLibrary(
  config: AiConfig,
  input: AskInput,
  userId: string,
  signal?: AbortSignal,
): AsyncGenerator<AskEvent> {
  try {
    const scope = await resolveScope(input.scopeId, userId);
    let passages: Passage[];
    let mode: string;
    if (scope.full) {
      passages = scope.full;
      mode = "full";
    } else {
      const keywords = await searchKeywords(config, input.question, signal);
      passages = await searchPassages(keywords, scope.containerIds, userId);
      mode = "search";
    }

    yield {
      type: "sources",
      scope: scope.entity?.title ?? "Entire library",
      mode,
      sources: passages.map((p, i) => ({
        n: i + 1,
        id: p.id,
        type: p.type,
        parentId: p.parentId,
        reference: p.reference,
      })),
    };

    const context =
      passages.length > 0
        ? formatPassages(passages)
        : "(no matching passages were found)";
    const coverage =
      mode === "full"
        ? `These passages are the complete content of "${scope.entity?.title}", in reading order.`
        : `These passages were selected by keyword search from ${scope.entity ? `"${scope.entity.title}"` : "the entire library"}; other relevant passages may exist.`;

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(input.history ?? []).slice(-6),
      {
        role: "user",
        content: `${coverage}\n\n${context}\n\nQuestion: ${input.question}`,
      },
    ];
    for await (const text of chatStream(config, messages, signal)) {
      yield { type: "delta", text };
    }
    yield { type: "done" };
  } catch (error) {
    if (signal?.aborted) return;
    console.error("askLibrary failed:", error);
    yield {
      type: "error",
      error: error instanceof Error ? error.message : "The AI request failed",
    };
  }
}
