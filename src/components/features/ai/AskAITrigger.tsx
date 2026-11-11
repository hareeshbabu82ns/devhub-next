"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import AskAIChat from "./AskAIChat";

interface AskAITriggerProps {
  scopeId?: string | null;
  scopeLabel?: string;
}

/** Button that opens the AI question panel for a book, chapter or verse. */
export default function AskAITrigger({
  scopeId,
  scopeLabel,
}: AskAITriggerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          title="Ask AI about this"
          aria-label="Ask AI about this"
        >
          <Sparkles className="size-4" />
        </Button>
      </SheetTrigger>
      {/* full width on phones, a side panel on tablets and up */}
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-3 sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>Ask AI</SheetTitle>
          <SheetDescription className="sr-only">
            Ask a question about this content
          </SheetDescription>
        </SheetHeader>
        <AskAIChat scopeId={scopeId} scopeLabel={scopeLabel} />
      </SheetContent>
    </Sheet>
  );
}
