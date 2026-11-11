import { db } from "@/lib/db";
import {
  Passage,
  PASSAGE_SELECT,
  PassageRow,
  searchPassageRows,
  withReferences,
} from "../retrieval";
import { embedModelId, embedTexts, getEmbedConfig } from "./embeddings";
import {
  chunkScope,
  ConceptInfo,
  loadConcepts,
  loadScopeVectors,
  scopeHasIndex,
} from "./store";
import { fold, RELATION_VERB, RELATION_WEIGHT, topMatches } from "./text";

/**
 * Hybrid GraphRAG retrieval over the knowledge index.
 *
 *   1. Seeds: passages closest to the question by meaning (embeddings) and
 *      by wording (keyword search), plus the concepts the question names.
 *   2. Two hops through the graph: seed passages → the concepts they
 *      mention → other passages about those concepts. Each node is credited
 *      by the strongest relation that reached it, damped by distance and by
 *      how common the concept is (a hub like the hero of the book says
 *      little about any one question).
 *   3. The best passages and concepts become the model's context, each with
 *      the reason it was retrieved.
 */

export type RankedConcept = ConceptInfo & { score: number; reasons: string[] };

export type RagRetrieval = {
  passages: Passage[];
  /** why each passage was retrieved, by entity id */
  reasons: Map<string, string[]>;
  concepts: RankedConcept[];
  relations: { from: string; to: string; label: string }[];
  /** what found the seeds: "semantic + keyword", "keyword"... */
  via: string;
};

const VECTOR_SEEDS = 40;
const MIN_SIMILARITY = 0.2;
const KEYWORD_SEEDS = 24;
const EXPANDED_PASSAGES = 12;
const CONCEPT_FANOUT = 6;
const PER_EXPANSION = 240;
const MAX_PASSAGES = 16;
const MAX_CONCEPTS = 6;
const MAX_REASONS = 3;

/** Whole-phrase match on folded text. */
const phraseIn = (text: string, phrase: string) => {
  if (phrase.length < 3) return false;
  const at = text.indexOf(phrase);
  if (at < 0) return false;
  const before = text[at - 1] ?? " ";
  const after = text[at + phrase.length] ?? " ";
  return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
};

type Credit = { score: number; reasons: string[] };

const credit = (
  into: Map<string, Credit>,
  id: string,
  score: number,
  reason: string,
) => {
  if (score <= 0) return;
  const entry = into.get(id) ?? { score: 0, reasons: [] };
  entry.score += score;
  if (
    reason &&
    entry.reasons.length < MAX_REASONS &&
    !entry.reasons.includes(reason)
  ) {
    entry.reasons.push(reason);
  }
  into.set(id, entry);
};

/** Common concepts carry less: being about the hero says little by itself. */
const damp = (count: number) => 1 + Math.log10(1 + count) * 0.6;

const describeMention = (rel: string, label: string, why?: string | null) =>
  `${RELATION_VERB[rel] ?? "mentions"} ${label}${why ? `: ${why}` : ""}`;

/**
 * One relation per pair of concepts: the model words the same tie in many
 * ways ("teaches", "instructs", "advises"), so the most frequent wording
 * stands for all of them, weighted by how often the tie was stated.
 */
export const mergeRelations = (
  relations: { from: string; to: string; label: string }[],
) => {
  const pairs = new Map<
    string,
    { from: string; to: string; labels: Map<string, number> }
  >();
  for (const r of relations) {
    const key = `${r.from}|${r.to}`;
    const pair = pairs.get(key) ?? {
      from: r.from,
      to: r.to,
      labels: new Map(),
    };
    pair.labels.set(r.label, (pair.labels.get(r.label) ?? 0) + 1);
    pairs.set(key, pair);
  }
  return [...pairs.values()]
    .map((pair) => {
      const ranked = [...pair.labels.entries()].sort((a, b) => b[1] - a[1]);
      return {
        from: pair.from,
        to: pair.to,
        label: ranked[0][0],
        weight: ranked.reduce((sum, [, n]) => sum + n, 0),
      };
    })
    .sort((a, b) => b.weight - a.weight);
};

/**
 * Retrieves for a question inside a scope. Returns null when nothing in the
 * scope has been indexed, so the caller can fall back to keyword search.
 */
export async function ragRetrieve(
  question: string,
  scopeId: string | null,
  containerIds: string[] | null,
  keywords: string[],
  userId: string,
  signal?: AbortSignal,
): Promise<RagRetrieval | null> {
  if (!(await scopeHasIndex(containerIds))) return null;

  const embed = getEmbedConfig();
  const model = embed ? embedModelId(embed) : null;
  const passages = new Map<string, Credit>();
  const concepts = new Map<string, Credit>();
  const directConcepts = new Set<string>();
  const via: string[] = [];

  // ── 1 · seeds ──────────────────────────────────────────────────────────
  const [queryVector, lexical, conceptIndex] = await Promise.all([
    embed
      ? embedTexts(embed, [`${embed.queryPrefix}${question}`], signal)
          .then((v) => v[0])
          .catch((error) => {
            if (signal?.aborted) throw error;
            console.warn(
              "Embedding the question failed, using keywords only:",
              error,
            );
            return null;
          })
      : null,
    searchPassageRows(keywords, containerIds, KEYWORD_SEEDS),
    loadConcepts(model),
  ]);

  if (queryVector && model) {
    const vectors = await loadScopeVectors(scopeId, containerIds, model);
    const hits = topMatches(
      vectors.matrix,
      vectors.dim,
      queryVector,
      VECTOR_SEEDS,
      MIN_SIMILARITY,
    );
    if (hits.length > 0) via.push("semantic");
    hits.forEach((hit, rank) =>
      credit(
        passages,
        vectors.ids[hit.index],
        1.1 / (1 + rank * 0.15),
        "close in meaning",
      ),
    );
    // concepts close to the question in meaning
    topMatches(
      conceptIndex.matrix,
      conceptIndex.dim,
      queryVector,
      5,
      0.45,
    ).forEach((hit, rank) => {
      const key = conceptIndex.vectorKeys[hit.index];
      directConcepts.add(key);
      credit(concepts, key, 1 / (1 + rank * 0.3), "close to the question");
    });
  }
  if (lexical.length > 0) via.push("keyword");
  lexical.forEach(({ row, score }, rank) =>
    credit(
      passages,
      row.id,
      (0.45 * Math.min(score, 3)) / (1 + rank * 0.3),
      "matches the question's words",
    ),
  );
  // concepts the question names outright
  const folded = fold(question);
  for (const concept of conceptIndex.list) {
    const name = concept.names.find((n) => phraseIn(folded, n));
    if (!name) continue;
    directConcepts.add(concept.key);
    credit(concepts, concept.key, 1.6, "named in the question");
  }

  // ── 2 · two hops through the graph ─────────────────────────────────────
  const scope = chunkScope(containerIds);
  const label = (key: string) => conceptIndex.byKey.get(key)?.label ?? key;
  const count = (key: string) => conceptIndex.byKey.get(key)?.count ?? 1;

  const seedPassages = [...passages.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, EXPANDED_PASSAGES);
  const seedChunks = await db.ragChunk.findMany({
    where: { entityId: { in: seedPassages.map(([id]) => id) } },
    select: { entityId: true, mentions: true },
  });
  const seedScore = new Map(seedPassages.map(([id, c]) => [id, c.score]));
  for (const chunk of seedChunks) {
    const base = seedScore.get(chunk.entityId) ?? 0;
    for (const m of chunk.mentions) {
      credit(
        concepts,
        m.key,
        (base * (RELATION_WEIGHT[m.rel] ?? 0.5) * 0.6) / damp(count(m.key)),
        "",
      );
    }
  }

  // passages about the strongest concepts: one hop from a concept the
  // question names, two hops from a concept reached through a seed passage
  const expand = [...concepts.entries()]
    .filter(([key]) => conceptIndex.byKey.has(key))
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, CONCEPT_FANOUT);
  if (expand.length > 0) {
    via.push("graph");
    const keys = expand.map(([key]) => key);
    const expandScore = new Map(expand.map(([key, c]) => [key, c.score]));
    const [mentioning, relations] = await Promise.all([
      db.ragChunk.findMany({
        where: { ...scope, mentions: { some: { key: { in: keys } } } },
        select: { entityId: true, mentions: true },
        take: PER_EXPANSION,
      }),
      db.ragRelation.findMany({
        where: { OR: [{ from: { in: keys } }, { to: { in: keys } }] },
        take: 60,
      }),
    ]);
    for (const chunk of mentioning) {
      for (const m of chunk.mentions) {
        const base = expandScore.get(m.key);
        if (!base) continue;
        const hop = directConcepts.has(m.key) ? 0.6 : 0.22;
        credit(
          passages,
          chunk.entityId,
          (base * (RELATION_WEIGHT[m.rel] ?? 0.5) * hop) / damp(count(m.key)),
          describeMention(m.rel, label(m.key), m.why),
        );
      }
    }
    for (const r of relations) {
      const known = expandScore.get(r.from) ?? expandScore.get(r.to) ?? 0;
      const other = expandScore.has(r.from) ? r.to : r.from;
      if (!conceptIndex.byKey.has(other)) continue;
      credit(
        concepts,
        other,
        (known * RELATION_WEIGHT.RELATED * 0.6) / damp(count(other)),
        `${label(r.from)} ${r.label} ${label(r.to)}`,
      );
    }
  }

  // ── 3 · rank, and say why ──────────────────────────────────────────────
  const rankedPassages = [...passages.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, MAX_PASSAGES);
  const ids = rankedPassages.map(([id]) => id);
  const rows = (await db.entity.findMany({
    where: { id: { in: ids } },
    select: PASSAGE_SELECT,
  })) as PassageRow[];
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const ordered = ids
    .map((id) => rowById.get(id))
    .filter((r): r is PassageRow => !!r);

  // each passage also explains itself through what it mentions
  const finalChunks = await db.ragChunk.findMany({
    where: { entityId: { in: ordered.map((r) => r.id) } },
    select: { entityId: true, mentions: true },
  });
  const reasons = new Map(
    rankedPassages.map(([id, c]) => [id, [...c.reasons]]),
  );
  const mentionedBy = new Map<string, number>();
  for (const chunk of finalChunks) {
    const list = reasons.get(chunk.entityId) ?? [];
    for (const m of chunk.mentions) {
      mentionedBy.set(m.key, (mentionedBy.get(m.key) ?? 0) + 1);
      const reason = describeMention(m.rel, label(m.key), m.why);
      if (
        m.why &&
        list.length < MAX_REASONS &&
        !list.some((r) => r.startsWith(reason.split(":")[0]))
      ) {
        list.push(reason);
      }
    }
    reasons.set(chunk.entityId, list);
  }

  // keep concepts that the chosen passages actually touch, or the question names
  const rankedConcepts: RankedConcept[] = [...concepts.entries()]
    .filter(([key]) => mentionedBy.has(key) || directConcepts.has(key))
    .map(([key, c]) => ({ info: conceptIndex.byKey.get(key), ...c }))
    .filter((c): c is Credit & { info: ConceptInfo } => !!c.info)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CONCEPTS)
    .map((c) => ({
      ...c.info,
      score: c.score,
      reasons: c.reasons.filter(Boolean),
    }));

  const conceptKeys = rankedConcepts.map((c) => c.key);
  const between =
    conceptKeys.length > 1
      ? await db.ragRelation.findMany({
          where: { from: { in: conceptKeys }, to: { in: conceptKeys } },
          take: 40,
        })
      : [];
  const relations = mergeRelations(between)
    .slice(0, 10)
    .map(({ from, to, label }) => ({ from, to, label }));

  return {
    passages: await withReferences(ordered, userId),
    reasons,
    concepts: rankedConcepts,
    relations,
    via: via.join(" + ") || "graph",
  };
}
