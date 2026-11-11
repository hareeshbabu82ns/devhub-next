import { AiConfig } from "./config";
import { chatComplete, ChatMessage, chatStream } from "./client";
import { Passage, resolveScope, searchPassages } from "./retrieval";
import { ragRetrieve, RagRetrieval } from "./rag/retrieve";
import {
  CONCEPT_KIND_LABEL,
  CONCEPT_SOURCE_TYPE,
  conceptKindOf,
} from "./rag/text";

export type AskSource = {
  n: number;
  id: string;
  type: string;
  parentId: string | null;
  reference: string;
};

export type AskEvent =
  /** the saved chat this turn belongs to; sent first by the API route */
  | { type: "chat"; id: string; title: string }
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

export const formatPassages = (
  passages: Passage[],
  /** why each passage was retrieved, by passage id */
  reasons?: Map<string, string[]>,
) =>
  passages
    .map((p, i) =>
      [
        `[${i + 1}] ${p.reference}`,
        p.text,
        p.meaning && `Meaning: ${p.meaning}`,
        ...p.notes,
        reasons?.get(p.id)?.length &&
          `Why retrieved: ${reasons.get(p.id)!.join("; ")}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");

/**
 * The knowledge-graph part of the context: the concepts the retrieved
 * passages share, numbered on from the passages so they are cited the same
 * way, and the relations stated between them.
 */
export const formatConcepts = (
  retrieval: Pick<RagRetrieval, "concepts" | "relations">,
  firstNumber: number,
) => {
  if (retrieval.concepts.length === 0) return "";
  const label = (key: string) =>
    retrieval.concepts.find((c) => c.key === key)?.label ?? key;
  const lines = retrieval.concepts.map(
    (c, i) =>
      `[${firstNumber + i}] ${CONCEPT_KIND_LABEL[conceptKindOf(c.key)]}: ${c.label}${c.original ? ` (${c.original})` : ""}${c.description ? ` — ${c.description}` : ""}`,
  );
  const relations = retrieval.relations.map(
    (r) => `- ${label(r.from)} ${r.label} ${label(r.to)}`,
  );
  return [
    "Knowledge graph — who and what these passages are about:",
    ...lines,
    ...(relations.length > 0
      ? ["Relations stated in the text:", ...relations]
      : []),
  ].join("\n");
};

const SYSTEM_PROMPT = `You answer questions about a personal library of Hindu devotional and scriptural texts.
Use ONLY the numbered passages and knowledge-graph entries provided. Cite what you rely on with its number in square brackets, like [3]; never invent a verse, a number or a quotation.
"Why retrieved" lines explain how a passage relates to the question; use them to connect ideas, but do not quote them.
If the passages do not contain the answer, say so plainly instead of answering from general knowledge.
Answer the question that was asked. Never tell the person what they feel; acknowledge a feeling only if they stated it. For personal questions be kind and practical, and if someone mentions self-harm, put their safety first and urge them to contact a local crisis line or emergency services.
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
    let graph: RagRetrieval | null = null;
    if (scope.full) {
      passages = scope.full;
      mode = "full";
    } else {
      // an indexed scope is searched by meaning and through its knowledge
      // graph; the model is only asked for keywords when there is no index
      graph = await ragRetrieve(
        input.question,
        input.scopeId,
        scope.containerIds,
        naiveKeywords(input.question),
        userId,
        signal,
      ).catch((error) => {
        if (signal?.aborted) throw error;
        console.warn(
          "Knowledge-index retrieval failed, using keywords:",
          error,
        );
        return null;
      });
      if (graph && graph.passages.length > 0) {
        passages = graph.passages;
        mode = "graph";
      } else {
        graph = null;
        const keywords = await searchKeywords(config, input.question, signal);
        passages = await searchPassages(keywords, scope.containerIds, userId);
        mode = "search";
      }
    }

    yield {
      type: "sources",
      scope: scope.entity?.title ?? "Entire library",
      mode,
      sources: [
        ...passages.map((p, i) => ({
          n: i + 1,
          id: p.id,
          type: p.type,
          parentId: p.parentId,
          reference: p.reference,
        })),
        ...(graph?.concepts ?? []).map((c, i) => ({
          n: passages.length + i + 1,
          id: c.key,
          type: CONCEPT_SOURCE_TYPE,
          parentId: null,
          reference: `${c.label} (${CONCEPT_KIND_LABEL[conceptKindOf(c.key)].toLowerCase()})`,
        })),
      ],
    };

    const scopeName = scope.entity
      ? `"${scope.entity.title}"`
      : "the entire library";
    const context =
      passages.length > 0
        ? [
            formatPassages(passages, graph?.reasons),
            graph && formatConcepts(graph, passages.length + 1),
          ]
            .filter(Boolean)
            .join("\n\n")
        : "(no matching passages were found)";
    const coverage =
      mode === "full"
        ? `These passages are the complete content of "${scope.entity?.title}", in reading order.`
        : mode === "graph"
          ? `These passages were selected from ${scopeName} by meaning and by following its knowledge graph (${graph!.via}); other relevant passages may exist.`
          : `These passages were selected by keyword search from ${scopeName}; other relevant passages may exist.`;

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
