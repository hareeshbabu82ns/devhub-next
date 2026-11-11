import AskAIChat from "@/components/features/ai/AskAIChat";

export const metadata = { title: "Ask AI" };

export default function AskPage() {
  return (
    <div className="mx-auto flex h-[calc(100dvh_-_theme(spacing.24))] w-full max-w-3xl flex-col">
      <h1 className="pb-2 text-lg font-semibold">Ask AI</h1>
      <AskAIChat />
    </div>
  );
}
