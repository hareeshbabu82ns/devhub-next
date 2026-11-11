import { AiConfig } from "../config";
import { chatComplete } from "../client";
import { Extraction, parseExtraction } from "./text";

const SYSTEM_PROMPT = `You read passages from Hindu scriptural and devotional texts (Sanskrit, with meanings where available) and record what each passage is about, for a knowledge graph.

Reply with ONLY one JSON object in this shape:
{"entities":[{"name":"Hanuman","kind":"character","original":"हनुमान्","description":"Son of Vayu, devoted servant of Rama"}],
 "passages":[{"n":1,"mentions":[{"name":"Hanuman","rel":"MENTIONS","why":"leaps across the ocean"}]}],
 "relations":[{"from":"Hanuman","to":"Rama","label":"devotee of","n":1}]}

entities — every distinct thing the passages are about:
- kind is one of: character (a person, deity, sage, being), concept (a teaching, idea, practice, quality, sacred object), place, state (a state of mind or emotion, e.g. grief, anger, equanimity), event.
- name: the most common plain spelling, no diacritics, no honorifics ("Rama", not "Śrī Rāma" or "Lord Rama"). Use the Sanskrit term for concepts and states ("Dharma", "Krodha"). If the thing is in "Known names", use that exact name.
- original: the name in the script of the text, if it appears.
- description: at most 20 words on who or what it is in general, not what happens in these passages.

passages — one item per passage number that mentions anything. At most 6 mentions each, the most significant first. rel is one of:
- SPOKEN_BY: this character speaks the passage.
- ADDRESSES: the passage is spoken to this character.
- DEFINES: the passage teaches or explains this concept.
- DEPICTS: the passage shows this state of mind or this event taking place.
- MENTIONS: anything else.
why: at most 12 words on what the passage says about it.

relations — only relations the passages themselves state between two entities (family, teacher, enemy, cause, remedy, location). label is 1-3 lowercase words read as "from label to". n is the passage it comes from.

Rules: record only what is in the passages; never add outside knowledge. Skip generic words (man, world, thing). Every name used in passages or relations must be listed in entities. Do not think aloud; output the JSON object only.`;

export type ExtractPassage = { label: string; text: string };

/**
 * Asks the model what a group of passages mentions. Returns an empty
 * extraction when the reply is unusable — the caller counts that as a failure.
 */
export async function extractGraph(
  config: AiConfig,
  input: { source: string; passages: ExtractPassage[]; known: string[] },
  signal?: AbortSignal,
): Promise<Extraction> {
  const body = input.passages
    .map((p, i) => `[${i + 1}] (${p.label})\n${p.text}`)
    .join("\n\n");
  const reply = await chatComplete(
    config,
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Source: ${input.source}\nKnown names: ${input.known.join(", ") || "(none yet)"}\n\n${body}`,
      },
    ],
    signal,
    {
      temperature: 0.1,
      // e.g. "none" or "low": reasoning models spend most of their time
      // thinking, which this step does not need
      ...(process.env.AI_RAG_REASONING_EFFORT?.trim()
        ? { reasoning_effort: process.env.AI_RAG_REASONING_EFFORT.trim() }
        : {}),
    },
  );
  return parseExtraction(reply, input.passages.length);
}
