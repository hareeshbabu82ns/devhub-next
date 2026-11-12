import {
  changeScheme,
  ConverterState,
  editSide,
  swapSides,
} from "../converter-state";

const initial: ConverterState = {
  from: "ITRANS",
  to: "TEL",
  fromText: "",
  toText: "",
  active: "from",
};

describe("editSide", () => {
  it("derives the other pane in both directions", () => {
    const a = editSide(initial, "from", "rAmaH");
    expect(a.toText).toBe("రామః");
    const b = editSide(a, "to", "కృష్ణః");
    expect(b.fromText).toBe("kRRiShNaH");
    expect(b.active).toBe("to");
  });

  it("clears both panes", () => {
    const a = editSide(editSide(initial, "from", "rAma"), "from", "");
    expect([a.fromText, a.toText]).toEqual(["", ""]);
  });

  it("switches the pane scheme when another script is pasted", () => {
    const a = editSide(initial, "from", "रामः", { autoDetect: true });
    expect(a.from).toBe("SAN");
    expect(a.toText).toBe("రామః");
  });

  it("moves the other pane away when the pasted script is its scheme", () => {
    const a = editSide(initial, "from", "రామః", { autoDetect: true });
    expect([a.from, a.to]).toEqual(["TEL", "ITRANS"]);
    expect(a.toText).toBe("rAmaH");
  });

  it("does not switch while Latin letters are typed into a script pane", () => {
    const a = editSide(initial, "to", "రామ kri", { autoDetect: true });
    expect(a.to).toBe("TEL");
  });

  it("survives schemes without a transliteration (no crash)", () => {
    const a = editSide({ ...initial, to: "ENG" }, "from", "rAma");
    expect(a.toText).toBe("rAma");
  });
});

describe("changeScheme", () => {
  const typed = editSide(initial, "from", "rAmaH");

  it("rewrites the pane in the new scheme by default", () => {
    const a = changeScheme(typed, "from", "IAST");
    expect([a.fromText, a.toText]).toEqual(["rāmaḥ", "రామః"]);
    const b = changeScheme(typed, "to", "SAN");
    expect([b.fromText, b.toText]).toEqual(["rAmaH", "रामः"]);
  });

  it("derives from the source of truth, not from a lossy pane", () => {
    const tamil = editSide({ ...initial, from: "SAN", to: "TAM" }, "from", "धर्मः");
    const a = changeScheme(tamil, "to", "TEL");
    expect(a.toText).toBe("ధర్మః");
  });

  it("re-reads the text when convertOnSwitch is off", () => {
    const hk = editSide(initial, "from", "kRSNa");
    const a = changeScheme(hk, "from", "HK", { convertOnSwitch: false });
    expect([a.fromText, a.toText]).toEqual(["kRSNa", "కృష్ణ"]);
  });

  it("swaps when the other pane's scheme is picked", () => {
    const a = changeScheme(typed, "from", "TEL");
    expect(a).toEqual(swapSides(typed));
    expect([a.from, a.to, a.fromText, a.toText]).toEqual([
      "TEL",
      "ITRANS",
      "రామః",
      "rAmaH",
    ]);
  });
});
