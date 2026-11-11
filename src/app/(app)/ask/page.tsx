import AskAIChat from "@/components/features/ai/AskAIChat";
import RagIndexTrigger from "@/components/features/ai/RagIndexTrigger";

export const metadata = { title: "Ask AI" };

export default function AskPage() {
  return (
    <div className="mx-auto flex h-[calc(100dvh_-_theme(spacing.24))] w-full max-w-3xl flex-col">
      <div className="flex items-center justify-between gap-2 pb-2">
        <h1 className="text-lg font-semibold">Ask AI</h1>
        <RagIndexTrigger scopeId={null} />
      </div>
      <AskAIChat />
    </div>
  );
}
