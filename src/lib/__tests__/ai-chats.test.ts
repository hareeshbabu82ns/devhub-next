import { chatHistory, chatTitleFrom, CHAT_TITLE_MAX } from "../ai/chats";

describe("chatTitleFrom", () => {
  it("collapses whitespace into one line", () => {
    expect(chatTitleFrom("  Who is\n\nHanuman?  ")).toBe("Who is Hanuman?");
  });

  it("shortens long questions", () => {
    const title = chatTitleFrom("word ".repeat(50));
    expect(title.length).toBeLessThanOrEqual(CHAT_TITLE_MAX);
    expect(title.endsWith("…")).toBe(true);
  });
});

describe("chatHistory", () => {
  it("keeps only answered turns, as user/assistant pairs", () => {
    expect(
      chatHistory([
        { question: "q1", answer: "a1", sources: [] },
        { question: "q2", answer: "", sources: [], error: "failed" },
      ]),
    ).toEqual([
      { role: "user", content: "q1" },
      { role: "assistant", content: "a1" },
    ]);
  });
});
