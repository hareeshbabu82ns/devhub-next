"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  History,
  Loader2,
  MessageSquare,
  Mic,
  Plus,
  SendHorizontal,
  Square,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { entityChildTypes } from "@/lib/entity-types";
import type { AskEvent, AskSource } from "@/lib/ai/ask";
import type { AiChatTurn as Turn } from "@/lib/ai/chats";
import { getAiChat } from "@/app/(app)/ask/actions";
import AskAIHistory, { aiChatsKey } from "./AskAIHistory";
import AskAIVoiceSettings from "./AskAIVoiceSettings";
import { useSpeechSettings } from "./use-speech-settings";
import { useReadAloud } from "./use-read-aloud";
import { useDictation } from "./use-dictation";

/** Remembers the open chat per scope so a reload brings it back. */
const activeChatKey = (scopeId: string | null) =>
  `ask-ai:active-chat:${scopeId ?? "library"}`;

const readActiveChat = (scopeId: string | null) => {
  try {
    return localStorage.getItem(activeChatKey(scopeId));
  } catch {
    return null;
  }
};

const writeActiveChat = (scopeId: string | null, id: string | null) => {
  try {
    if (id) localStorage.setItem(activeChatKey(scopeId), id);
    else localStorage.removeItem(activeChatKey(scopeId));
  } catch {
    // storage unavailable (private mode); the chat is still saved server-side
  }
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
  const queryClient = useQueryClient();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [loadingChat, setLoadingChat] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const selectChat = useCallback(
    (id: string | null, title: string | null = null) => {
      setChatId(id);
      setChatTitle(title);
      writeActiveChat(scopeId, id);
    },
    [scopeId],
  );

  const { data: status } = useQuery({
    queryKey: ["aiStatus"],
    queryFn: async () => {
      const res = await fetch("/api/ai/ask");
      return (await res.json()) as {
        configured?: boolean;
        speech?: {
          transcribe: boolean;
          speak: boolean;
          speakVia?: ("library" | "model")[];
        };
      };
    },
    staleTime: 5 * 60 * 1000,
  });
  const speechServers = status?.speech ?? { transcribe: false, speak: false };

  const [speechSettings, updateSpeechSettings] = useSpeechSettings();
  const reader = useReadAloud(speechSettings, speechServers.speak);
  const stopReading = reader.stop;

  // what was typed before speaking; the transcript is added after it
  const typedRef = useRef("");
  const askRef = useRef<(text?: string) => void>(() => {});
  const dictation = useDictation(
    speechSettings,
    speechServers.transcribe,
    (text) => setQuestion(typedRef.current + text),
    (text) => {
      if (speechSettings.autoSend) askRef.current(typedRef.current + text);
    },
  );

  const startDictation = () => {
    stopReading();
    typedRef.current = question.trim() ? `${question.trim()} ` : "";
    if (speechSettings.autoRead && speechSettings.autoSend) reader.prime();
    dictation.start();
  };

  const openChat = useCallback(
    async (id: string) => {
      abortRef.current?.abort();
      stopReading();
      setView("chat");
      setLoadingChat(true);
      try {
        const res = await getAiChat(id);
        if (res.status === "success") {
          setTurns(res.data.turns);
          selectChat(res.data.id, res.data.title);
        } else {
          // deleted elsewhere or never saved: start fresh
          setTurns([]);
          selectChat(null);
        }
      } finally {
        setLoadingChat(false);
      }
    },
    [selectChat, stopReading],
  );

  const newChat = () => {
    abortRef.current?.abort();
    stopReading();
    setTurns([]);
    selectChat(null);
    setView("chat");
  };

  // bring back the chat that was open before the reload
  useEffect(() => {
    const id = readActiveChat(scopeId);
    if (id) openChat(id);
  }, [scopeId, openChat]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  // stop a running answer when the panel goes away
  useEffect(() => () => abortRef.current?.abort(), []);

  const updateLast = (patch: (turn: Turn) => Turn) =>
    setTurns((all) => [...all.slice(0, -1), patch(all[all.length - 1])]);

  const ask = async (text?: string) => {
    const q = (text ?? question).trim();
    if (!q || busy) return;
    // typing Enter while still listening: use what was heard so far
    if (text === undefined && dictation.state !== "idle") dictation.cancel();
    const turnIndex = turns.length;
    let answer = "";
    let failed = false;
    stopReading();
    // unlock audio while still inside the tap, for the automatic read later
    if (speechSettings.autoRead) reader.prime();
    setTurns((all) => [...all, { question: q, answer: "", sources: [] }]);
    setQuestion("");
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, scopeId, chatId }),
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
          if (event.type === "chat") {
            selectChat(event.id, event.title);
          } else if (event.type === "sources") {
            updateLast((t) => ({
              ...t,
              sources: event.sources,
              mode: event.mode,
            }));
          } else if (event.type === "delta") {
            answer += event.text;
            updateLast((t) => ({ ...t, answer: t.answer + event.text }));
          } else if (event.type === "error") {
            failed = true;
            updateLast((t) => ({ ...t, error: event.error }));
          }
        }
      }
    } catch (error) {
      failed = true;
      if (!controller.signal.aborted) {
        updateLast((t) => ({
          ...t,
          error: error instanceof Error ? error.message : "Request failed",
        }));
      }
    } finally {
      setBusy(false);
      queryClient.invalidateQueries({ queryKey: aiChatsKey(scopeId) });
    }
    if (speechSettings.autoRead && answer && !failed) {
      reader.speak(`turn-${turnIndex}`, answer);
    }
  };
  askRef.current = ask;

  const notConfigured = status?.configured === false;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate text-sm text-muted-foreground">
            Asking within:{" "}
            <span className="font-medium text-foreground">
              {scopeLabel ?? (scopeId ? "this content" : "the entire library")}
            </span>
          </p>
          {view === "chat" && chatTitle && (
            <p className="truncate text-xs text-muted-foreground">
              {chatTitle}
            </p>
          )}
        </div>
        <AskAIVoiceSettings
          settings={speechSettings}
          onChange={updateSpeechSettings}
          voices={reader.voices}
          server={speechServers}
          browserRecognition={dictation.browserSupported}
          inputEngine={dictation.engine}
        />
        <Button
          type="button"
          size="icon"
          variant={view === "history" ? "secondary" : "ghost"}
          className="size-10 shrink-0"
          title={view === "history" ? "Back to chat" : "Chat history"}
          aria-label={view === "history" ? "Back to chat" : "Chat history"}
          aria-pressed={view === "history"}
          onClick={() => setView(view === "history" ? "chat" : "history")}
        >
          {view === "history" ? (
            <MessageSquare className="size-4" />
          ) : (
            <History className="size-4" />
          )}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-10 shrink-0"
          title="New chat"
          aria-label="New chat"
          disabled={view === "chat" && turns.length === 0 && !chatId}
          onClick={newChat}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {notConfigured && (
        <p className="rounded-md border p-3 text-sm" role="alert">
          No AI model is connected yet. Set <code>AI_BASE_URL</code> and{" "}
          <code>AI_MODEL</code> (plus <code>AI_API_KEY</code> if your provider
          needs one) in the server environment and restart the app. Any
          OpenAI-compatible endpoint works.
        </p>
      )}

      {view === "history" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AskAIHistory
            scopeId={scopeId}
            activeId={chatId}
            onOpen={openChat}
            onDeleted={(id) => {
              if (id === chatId) {
                setTurns([]);
                selectChat(null);
              }
            }}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
          {loadingChat && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading chat…
            </p>
          )}
          {turns.length === 0 && !notConfigured && !loadingChat && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Ask about a story, a verse, a name or a teaching. Answers come
              only from your library and link back to the verses used.
            </p>
          )}
          <div className="flex flex-col gap-5">
            {turns.map((turn, i) => {
              const cited = new Set(
                [...turn.answer.matchAll(/\[(\d+)\]/g)].map((m) =>
                  Number(m[1]),
                ),
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
                  {turn.answer &&
                    reader.supported &&
                    !(busy && i === turns.length - 1) && (
                      <div className="-ml-2 flex">
                        {reader.speakingKey === `turn-${i}` ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 gap-2 text-muted-foreground"
                            onClick={stopReading}
                          >
                            <Square className="size-4" />
                            Stop reading
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 gap-2 text-muted-foreground"
                            onClick={() =>
                              reader.speak(`turn-${i}`, turn.answer)
                            }
                          >
                            <Volume2 className="size-4" />
                            Read aloud
                          </Button>
                        )}
                      </div>
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
      )}

      {(dictation.error || reader.error) && (
        <p className="-mb-1 text-sm text-destructive" role="alert">
          {dictation.error ?? reader.error}
        </p>
      )}
      {!dictation.error && !reader.error && reader.notice && (
        <p className="-mb-1 text-xs text-muted-foreground">{reader.notice}</p>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
      >
        <Textarea
          aria-label="Your question"
          placeholder={
            dictation.state === "listening"
              ? "Listening…"
              : dictation.state === "transcribing"
                ? "Writing down what you said…"
                : "Ask a question…"
          }
          className="max-h-40 min-h-11 flex-1 resize-none text-base md:text-sm"
          rows={1}
          value={question}
          disabled={notConfigured || loadingChat}
          readOnly={dictation.state !== "idle"}
          onFocus={() => setView("chat")}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter makes a new line
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              ask();
            }
          }}
        />
        {dictation.available && !busy && (
          <Button
            type="button"
            size="icon"
            variant={
              dictation.state === "listening" ? "destructive" : "outline"
            }
            className={cn(
              "size-11 shrink-0",
              dictation.state === "listening" && "animate-pulse",
            )}
            aria-label={
              dictation.state === "listening"
                ? "Stop listening"
                : "Speak your question"
            }
            title={
              dictation.state === "listening"
                ? "Stop listening"
                : "Speak your question"
            }
            disabled={
              notConfigured || loadingChat || dictation.state === "transcribing"
            }
            onClick={() =>
              dictation.state === "listening"
                ? dictation.stop()
                : startDictation()
            }
          >
            {dictation.state === "transcribing" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : dictation.state === "listening" ? (
              <Square className="size-4" />
            ) : (
              <Mic className="size-4" />
            )}
          </Button>
        )}
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
            disabled={
              !question.trim() ||
              notConfigured ||
              loadingChat ||
              dictation.state === "transcribing"
            }
          >
            <SendHorizontal className="size-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
