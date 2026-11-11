"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SendHorizontal, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { entityChildTypes } from "@/lib/entity-types";
import type { AskEvent, AskSource } from "@/lib/ai/ask";

type Turn = {
  question: string;
  answer: string;
  sources: AskSource[];
  mode?: string;
  error?: string;
};

const sourceHref = (s: AskSource) =>
  entityChildTypes(s.type).length === 0 && s.parentId
    ? `/entities/${s.parentId}/child/${s.id}`
    : `/entities/${s.id}`;

interface AskAIChatProps {
  /** Book, chapter or verse to stay within; omit for the whole library. */
  scopeId?: string | null;
  scopeLabel?: string;
  className?: string;
}

/**
 * Question-and-answer over the library through the configured
 * OpenAI-compatible model. Answers cite the passages they were built from.
 */
export default function AskAIChat({
  scopeId = null,
  scopeLabel,
  className,
}: AskAIChatProps) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: status } = useQuery({
    queryKey: ["aiStatus"],
    queryFn: async () => {
      const res = await fetch("/api/ai/ask");
      return (await res.json()) as { configured?: boolean };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  // stop a running answer when the panel goes away
  useEffect(() => () => abortRef.current?.abort(), []);

  const updateLast = (patch: (turn: Turn) => Turn) =>
    setTurns((all) => [...all.slice(0, -1), patch(all[all.length - 1])]);

  const ask = async () => {
    const q = question.trim();
    if (!q || busy) return;
    const history = turns
      .filter((t) => t.answer)
      .flatMap((t) => [
        { role: "user" as const, content: t.question },
        { role: "assistant" as const, content: t.answer },
      ]);
    setTurns((all) => [...all, { question: q, answer: "", sources: [] }]);
    setQuestion("");
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, scopeId, history }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as AskEvent;
          if (event.type === "sources") {
            updateLast((t) => ({
              ...t,
              sources: event.sources,
              mode: event.mode,
            }));
          } else if (event.type === "delta") {
            updateLast((t) => ({ ...t, answer: t.answer + event.text }));
          } else if (event.type === "error") {
            updateLast((t) => ({ ...t, error: event.error }));
          }
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        updateLast((t) => ({
          ...t,
          error: error instanceof Error ? error.message : "Request failed",
        }));
      }
    } finally {
      setBusy(false);
    }
  };

  const notConfigured = status?.configured === false;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-3", className)}>
      <p className="text-sm text-muted-foreground">
        Asking within:{" "}
        <span className="font-medium text-foreground">
          {scopeLabel ?? (scopeId ? "this content" : "the entire library")}
        </span>
      </p>

      {notConfigured && (
        <p className="rounded-md border p-3 text-sm" role="alert">
          No AI model is connected yet. Set <code>AI_BASE_URL</code> and{" "}
          <code>AI_MODEL</code> (plus <code>AI_API_KEY</code> if your provider
          needs one) in the server environment and restart the app. Any
          OpenAI-compatible endpoint works.
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        {turns.length === 0 && !notConfigured && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Ask about a story, a verse, a name or a teaching. Answers come only
            from your library and link back to the verses used.
          </p>
        )}
        <div className="flex flex-col gap-5">
          {turns.map((turn, i) => {
            const cited = new Set(
              [...turn.answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])),
            );
            // show what the answer cites; before any citation, the first few
            const sources =
              cited.size > 0
                ? turn.sources.filter((s) => cited.has(s.n))
                : turn.sources.slice(0, 6);
            return (
              <div key={i} className="flex flex-col gap-2">
                <p className="self-end rounded-lg bg-secondary/20 px-3 py-2 max-w-[90%] whitespace-pre-wrap break-words">
                  {turn.question}
                </p>
                {turn.answer ? (
                  <div className="markdown-content break-words leading-relaxed">
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {turn.answer}
                    </Markdown>
                  </div>
                ) : (
                  !turn.error &&
                  busy &&
                  i === turns.length - 1 && (
                    <p className="text-sm text-muted-foreground">
                      {turn.sources.length > 0
                        ? `Reading ${turn.sources.length} passages…`
                        : "Searching the library…"}
                    </p>
                  )
                )}
                {turn.error && (
                  <p className="text-sm text-destructive" role="alert">
                    {turn.error}
                  </p>
                )}
                {sources.length > 0 && turn.answer && (
                  <ul className="flex flex-col gap-1 border-l pl-3 text-sm">
                    {sources.map((s) => (
                      <li key={s.n}>
                        <Link
                          href={sourceHref(s)}
                          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                          [{s.n}] {s.reference}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
      >
        <Textarea
          aria-label="Your question"
          placeholder="Ask a question…"
          className="max-h-40 min-h-11 flex-1 resize-none text-base md:text-sm"
          rows={1}
          value={question}
          disabled={notConfigured}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter makes a new line
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              ask();
            }
          }}
        />
        {busy ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-11 shrink-0"
            aria-label="Stop"
            onClick={() => abortRef.current?.abort()}
          >
            <Square className="size-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            className="size-11 shrink-0"
            aria-label="Ask"
            disabled={!question.trim() || notConfigured}
          >
            <SendHorizontal className="size-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
