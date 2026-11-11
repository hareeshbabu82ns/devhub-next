"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Check, MessageSquare, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { CHAT_TITLE_MAX, type AiChatSummary } from "@/lib/ai/chats";
import {
  deleteAiChat,
  listAiChats,
  renameAiChat,
} from "@/app/(app)/ask/actions";

export const aiChatsKey = (scopeId: string | null) => [
  "aiChats",
  scopeId ?? "library",
];

interface AskAIHistoryProps {
  scopeId: string | null;
  activeId: string | null;
  onOpen: (id: string) => void;
  onDeleted: (id: string) => void;
}

/** Saved conversations within the current scope: open, rename or delete. */
export default function AskAIHistory({
  scopeId,
  activeId,
  onOpen,
  onDeleted,
}: AskAIHistoryProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<AiChatSummary | null>(
    null,
  );

  const {
    data: chats,
    isLoading,
    error,
  } = useQuery({
    queryKey: aiChatsKey(scopeId),
    queryFn: async () => {
      const res = await listAiChats(scopeId);
      if (res.status === "error") throw new Error(res.error);
      return res.data;
    },
  });

  const rename = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await renameAiChat(id, title);
      if (res.status === "error") throw new Error(res.error);
    },
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: aiChatsKey(scopeId) });
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteAiChat(id);
      if (res.status === "error") throw new Error(res.error);
      return id;
    },
    onSuccess: (id) => {
      onDeleted(id);
      queryClient.invalidateQueries({ queryKey: aiChatsKey(scopeId) });
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => setConfirmDelete(null),
  });

  if (isLoading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Loading chats…
      </p>
    );
  }
  if (error) {
    return (
      <p className="py-8 text-center text-sm text-destructive" role="alert">
        {error.message}
      </p>
    );
  }
  if (!chats?.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No saved chats here yet. Your questions are saved automatically.
      </p>
    );
  }

  const saveRename = (id: string) => {
    const title = draft.trim();
    if (!title) return;
    rename.mutate({ id, title });
  };

  return (
    <>
      <ul className="flex flex-col gap-1">
        {chats.map((chat) => (
          <li
            key={chat.id}
            className={cn(
              "flex items-center gap-1 rounded-md border border-transparent",
              chat.id === activeId && "border-border bg-muted/50",
            )}
          >
            {editingId === chat.id ? (
              <form
                className="flex flex-1 items-center gap-1 p-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveRename(chat.id);
                }}
              >
                <Input
                  autoFocus
                  aria-label="Chat name"
                  className="h-10 flex-1 text-base md:text-sm"
                  maxLength={CHAT_TITLE_MAX}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setEditingId(null)}
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  className="size-10 shrink-0"
                  aria-label="Save name"
                  disabled={!draft.trim() || rename.isPending}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-10 shrink-0"
                  aria-label="Cancel rename"
                  onClick={() => setEditingId(null)}
                >
                  <X className="size-4" />
                </Button>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted"
                  onClick={() => onOpen(chat.id)}
                >
                  <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {chat.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {chat.turnCount}{" "}
                      {chat.turnCount === 1 ? "question" : "questions"} ·{" "}
                      {formatDistanceToNow(new Date(chat.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </span>
                </button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-10 shrink-0"
                  aria-label={`Rename ${chat.title}`}
                  onClick={() => {
                    setDraft(chat.title);
                    setEditingId(chat.id);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-10 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${chat.title}`}
                  onClick={() => setConfirmDelete(chat)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{confirmDelete?.title}&rdquo; and all its answers will be
              removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (confirmDelete) remove.mutate(confirmDelete.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
