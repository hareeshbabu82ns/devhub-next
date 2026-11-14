import {
  parsePositions,
  parseQuestion,
  selectPositions,
  selectRelative,
} from "../ai/positions";

describe("parsePositions", () => {
  it("reads the first / last few verses", () => {
    expect(parsePositions("explain first 10 slokas in this chapter")).toEqual({
      kind: "first",
      count: 10,
    });
    expect(parsePositions("Summarise the last three ślokas")).toEqual({
      kind: "last",
      count: 3,
    });
    expect(parsePositions("what does the opening verse say?")).toEqual({
      kind: "first",
      count: 1,
    });
    expect(parsePositions("explain the first 10")).toEqual({
      kind: "first",
      count: 10,
    });
  });

  it("reads verse numbers and ranges", () => {
    expect(parsePositions("explain verse 12")).toEqual({
      kind: "numbers",
      ranges: [[12, 12]],
    });
    expect(parsePositions("translate shlokas 5 to 10")).toEqual({
      kind: "numbers",
      ranges: [[5, 10]],
    });
    expect(parsePositions("compare verses 3, 7 and 20-22")).toEqual({
      kind: "numbers",
      ranges: [
        [3, 3],
        [7, 7],
        [20, 22],
      ],
    });
    expect(parsePositions("meaning of the 10th sloka")).toEqual({
      kind: "numbers",
      ranges: [[10, 10]],
    });
  });

  it("leaves other questions alone", () => {
    expect(parsePositions("Who is Hanuman?")).toBeNull();
    expect(parsePositions("summarise the first 2 chapters")).toBeNull();
    expect(parsePositions("which verse praises Rama first?")).toBeNull();
    expect(parsePositions("where did Rama rest that night?")).toBeNull();
    expect(parsePositions("which is that verse where Sita speaks?")).toBeNull();
  });
});

describe("selectPositions", () => {
  const items = Array.from({ length: 30 }, (_, order) => ({ order }));
  const numbers = (picked: { items: { order: number }[] }) =>
    picked.items.map((item) => item.order + 1);

  it("takes from either end", () => {
    expect(
      numbers(selectPositions(items, { kind: "first", count: 3 }, 99)),
    ).toEqual([1, 2, 3]);
    expect(
      numbers(selectPositions(items, { kind: "last", count: 2 }, 99)),
    ).toEqual([29, 30]);
  });

  it("takes verse numbers as shown in references", () => {
    expect(
      numbers(
        selectPositions(
          items,
          {
            kind: "numbers",
            ranges: [
              [5, 6],
              [40, 41],
              [9, 9],
            ],
          },
          99,
        ),
      ),
    ).toEqual([5, 6, 9]);
  });

  it("caps what is returned and says so", () => {
    const picked = selectPositions(items, { kind: "first", count: 20 }, 8);
    expect(picked.items).toHaveLength(8);
    expect(picked.truncated).toBe(true);
  });
});

describe("parsePositions — open ranges", () => {
  const numbers = (from: number, to: number) => ({
    kind: "numbers",
    ranges: [[from, to]],
  });

  it("reads ranges with one end left open", () => {
    expect(parsePositions("explain from verse 20 onwards")).toEqual(
      numbers(20, Infinity),
    );
    expect(parsePositions("slokas 20 to the end")).toEqual(
      numbers(20, Infinity),
    );
    expect(parsePositions("what happens after verse 20?")).toEqual(
      numbers(21, Infinity),
    );
    expect(parsePositions("summarise up to verse 15")).toEqual(numbers(1, 15));
    expect(parsePositions("everything before sloka 8")).toEqual(numbers(1, 7));
    expect(parsePositions("from verse 5 to 10")).toEqual(numbers(5, 10));
    expect(parsePositions("verse 5 till verse 10")).toEqual(numbers(5, 10));
  });

  it("reads a count from an anchor", () => {
    expect(parsePositions("next 5 verses after verse 20")).toEqual(
      numbers(21, 25),
    );
    expect(parsePositions("ten slokas starting at 20")).toEqual(
      numbers(20, 29),
    );
  });
});

describe("parsePositions — follow-ups", () => {
  it("reads what comes next or before", () => {
    expect(parsePositions("now explain the next 10")).toEqual({
      kind: "next",
      count: 10,
    });
    expect(parsePositions("next verse")).toEqual({ kind: "next", count: 1 });
    expect(parsePositions("explain the next slokas")).toEqual({
      kind: "next",
      count: null,
    });
    expect(parsePositions("continue")).toEqual({ kind: "next", count: null });
    expect(parsePositions("five more verses")).toEqual({
      kind: "next",
      count: 5,
    });
    expect(parsePositions("go back to the previous 3 verses")).toEqual({
      kind: "previous",
      count: 3,
    });
    expect(parsePositions("explain the rest of the chapter")).toEqual({
      kind: "rest",
    });
  });

  it("reads a return to the same verses", () => {
    expect(parsePositions("give word by word meaning of these verses")).toEqual(
      { kind: "same" },
    );
    expect(parsePositions("explain this sloka in Telugu")).toEqual({
      kind: "same",
    });
  });

  it("prefers a verse named outright", () => {
    expect(parsePositions("explain verse 12 like the previous verse")).toEqual({
      kind: "numbers",
      ranges: [[12, 12]],
    });
  });
});

describe("parseQuestion — chapters", () => {
  it("reads the chapter a question is about", () => {
    expect(parseQuestion("summarise chapter 3")).toEqual({
      path: [3],
      position: null,
    });
    expect(parseQuestion("first 5 verses of the 2nd sarga")).toEqual({
      path: [2],
      position: { kind: "first", count: 5 },
    });
    expect(parseQuestion("kanda 2 sarga 5 verse 3").path).toEqual([2, 5]);
    expect(parseQuestion("what is the last chapter about?").path).toEqual([-1]);
    expect(parseQuestion("summarise the first 2 chapters")).toEqual({
      path: [],
      position: null,
    });
  });

  it("reads dotted verse references", () => {
    expect(parseQuestion("explain verse 2.47")).toEqual({
      path: [2],
      position: { kind: "numbers", ranges: [[47, 47]] },
    });
    expect(parseQuestion("slokas 1.2.5 to 1.2.9")).toEqual({
      path: [1, 2],
      position: { kind: "numbers", ranges: [[5, 9]] },
    });
  });
});

describe("selectRelative", () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ id: `v${i + 1}` }));
  const read = new Set(["v11", "v12", "v13"]);
  const ids = (picked: { items: { id: string }[] } | null) =>
    picked?.items.map((item) => item.id);

  it("continues after, or goes back before, what was read", () => {
    expect(
      ids(selectRelative(items, read, { kind: "next", count: 2 }, 99)),
    ).toEqual(["v14", "v15"]);
    expect(
      ids(selectRelative(items, read, { kind: "next", count: null }, 99)),
    ).toEqual(["v14", "v15", "v16"]);
    expect(
      ids(selectRelative(items, read, { kind: "previous", count: 2 }, 99)),
    ).toEqual(["v9", "v10"]);
    expect(selectRelative(items, read, { kind: "rest" }, 5)).toMatchObject({
      truncated: true,
    });
  });

  it("is empty at the edge and null when nothing matches", () => {
    expect(
      ids(
        selectRelative(items, new Set(["v30"]), { kind: "next", count: 5 }, 99),
      ),
    ).toEqual([]);
    expect(
      selectRelative(items, new Set(["x"]), { kind: "next", count: 5 }, 99),
    ).toBeNull();
  });
});
