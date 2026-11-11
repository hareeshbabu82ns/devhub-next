import type { AskSource } from "./ask";

export type AiChatTurn = {
  question: string;
  answer: string;
  sources: AskSource[];
  mode?: string;
  error?: string;
};

export type AiChatSummary = {
  id: string;
  title: string;
  turnCount: number;
  updatedAt: string;
};

export type AiChatDetail = AiChatSummary & {
  scopeId: string | null;
  turns: AiChatTurn[];
};

export const CHAT_TITLE_MAX = 80;

/** A chat is named after its first question until the user renames it. */
export const chatTitleFrom = (question: string) => {
  const line = question.replace(/\s+/g, " ").trim();
  return line.length > CHAT_TITLE_MAX
    ? `${line.slice(0, CHAT_TITLE_MAX - 1).trimEnd()}…`
    : line;
};

/** Earlier answered turns, as the model's conversation history. */
export const chatHistory = (turns: AiChatTurn[]) =>
  turns
    .filter((t) => t.answer)
    .flatMap((t) => [
      { role: "user" as const, content: t.question },
      { role: "assistant" as const, content: t.answer },
    ]);
