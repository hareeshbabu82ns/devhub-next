import {
  audioFormat,
  currentTrack,
  emptyQueue,
  hasNext,
  hasPrev,
  queueReducer,
  QueueAction,
  QueueState,
  Track,
  trackTitle,
} from "../queue";

const t = (n: number): Track => ({
  id: `id${n}`,
  src: `/audio/${n}.mp3`,
  title: `Verse ${n}`,
});

const run = (actions: QueueAction[], from: QueueState = emptyQueue) =>
  actions.reduce(queueReducer, from);

const srcs = (s: QueueState) => s.tracks.map((x) => x.id);

describe("queueReducer", () => {
  it("play replaces the queue and starts at the given track", () => {
    const s = run([
      { type: "play", tracks: [t(1), t(2)] },
      {
        type: "play",
        tracks: [t(3), t(4), t(5)],
        startIndex: 1,
        source: { id: "ch2", label: "Chapter 2" },
      },
    ]);
    expect(srcs(s)).toEqual(["id3", "id4", "id5"]);
    expect(currentTrack(s)?.id).toBe("id4");
    expect(s.autoplay).toBe(true);
    expect(s.source?.label).toBe("Chapter 2");
  });

  it("play drops duplicates and empty sources but keeps the start track", () => {
    const s = run([
      {
        type: "play",
        tracks: [t(1), { ...t(9), src: "" }, t(1), t(2)],
        startIndex: 3,
      },
    ]);
    expect(srcs(s)).toEqual(["id1", "id2"]);
    expect(currentTrack(s)?.id).toBe("id2");
  });

  it("play with nothing playable leaves the queue alone", () => {
    const before = run([{ type: "play", tracks: [t(1)] }]);
    expect(run([{ type: "play", tracks: [] }], before)).toBe(before);
  });

  it("playNow jumps inside the queue when the track is already there", () => {
    const s = run([
      { type: "play", tracks: [t(1), t(2), t(3)] },
      { type: "playNow", track: t(3) },
    ]);
    expect(srcs(s)).toHaveLength(3);
    expect(s.index).toBe(2);
  });

  it("playNow plays a track from elsewhere on its own", () => {
    const s = run([
      { type: "play", tracks: [t(1), t(2)], source: { label: "Chapter 1" } },
      { type: "playNow", track: t(7) },
    ]);
    expect(srcs(s)).toEqual(["id7"]);
    expect(s.source).toBeUndefined();
  });

  it("playNow on the current track restarts it", () => {
    const a = run([{ type: "play", tracks: [t(1)] }]);
    const b = queueReducer(a, { type: "playNow", track: t(1) });
    expect(b.playToken).toBe(a.playToken + 1);
  });

  it("playNext inserts after the current track without interrupting it", () => {
    const a = run([{ type: "play", tracks: [t(1), t(2), t(3)], startIndex: 1 }]);
    const b = queueReducer(a, { type: "playNext", tracks: [t(8), t(3), t(2)] });
    expect(srcs(b)).toEqual(["id1", "id2", "id8", "id3"]);
    expect(currentTrack(b)?.id).toBe("id2");
    expect(b.playToken).toBe(a.playToken);
  });

  it("playNext moves an earlier track and keeps the current one current", () => {
    const s = run([
      { type: "play", tracks: [t(1), t(2), t(3)], startIndex: 2 },
      { type: "playNext", tracks: [t(1)] },
    ]);
    expect(srcs(s)).toEqual(["id2", "id3", "id1"]);
    expect(currentTrack(s)?.id).toBe("id3");
  });

  it("enqueue appends, and starts playing only when nothing was lined up", () => {
    const first = run([{ type: "enqueue", tracks: [t(1)] }]);
    expect(first.index).toBe(0);
    expect(first.autoplay).toBe(true);
    const second = queueReducer(first, {
      type: "enqueue",
      tracks: [t(1), t(2)],
    });
    expect(srcs(second)).toEqual(["id1", "id2"]);
    expect(second.playToken).toBe(first.playToken);
  });

  it("next stops at the end unless repeating the queue", () => {
    const end = run([{ type: "play", tracks: [t(1), t(2)], startIndex: 1 }]);
    expect(queueReducer(end, { type: "next" })).toBe(end);
    expect(hasNext(end)).toBe(false);
    const looping = run([{ type: "cycleRepeat" }], end);
    expect(looping.repeat).toBe("all");
    expect(hasNext(looping)).toBe(true);
    expect(queueReducer(looping, { type: "next" }).index).toBe(0);
  });

  it("prev at the top restarts the first track", () => {
    const a = run([{ type: "play", tracks: [t(1), t(2)] }]);
    expect(hasPrev(a)).toBe(false);
    const b = queueReducer(a, { type: "prev" });
    expect(b.index).toBe(0);
    expect(b.playToken).toBe(a.playToken + 1);
  });

  describe("when a track ends", () => {
    const two = run([{ type: "play", tracks: [t(1), t(2)] }]);

    it("moves on to the next track", () => {
      const s = queueReducer(two, { type: "ended" });
      expect(s.index).toBe(1);
      expect(s.autoplay).toBe(true);
    });

    it("rewinds and stops after the last track", () => {
      const s = run([{ type: "ended" }, { type: "ended" }], two);
      expect(s.index).toBe(0);
      expect(s.autoplay).toBe(false);
    });

    it("starts over with repeat all", () => {
      const s = run(
        [{ type: "cycleRepeat" }, { type: "ended" }, { type: "ended" }],
        two,
      );
      expect(s.index).toBe(0);
      expect(s.autoplay).toBe(true);
    });

    it("replays the same verse with repeat one", () => {
      const one = run([{ type: "cycleRepeat" }, { type: "cycleRepeat" }], two);
      expect(one.repeat).toBe("one");
      const s = queueReducer(one, { type: "ended" });
      expect(s.index).toBe(0);
      expect(s.playToken).toBe(one.playToken + 1);
      // skipping by hand still moves on
      expect(queueReducer(one, { type: "next" }).index).toBe(1);
    });
  });

  describe("remove", () => {
    const three = run([
      { type: "play", tracks: [t(1), t(2), t(3)], startIndex: 1 },
    ]);

    it("keeps the current track when an earlier one goes", () => {
      const s = queueReducer(three, { type: "remove", index: 0 });
      expect(currentTrack(s)?.id).toBe("id2");
      expect(s.playToken).toBe(three.playToken);
    });

    it("hands over to the following track when the current one goes", () => {
      const s = queueReducer(three, {
        type: "remove",
        index: 1,
        keepPlaying: true,
      });
      expect(currentTrack(s)?.id).toBe("id3");
      expect(s.autoplay).toBe(true);
      expect(s.playToken).toBe(three.playToken + 1);
    });

    it("empties the queue with the last track", () => {
      const s = run(
        [{ type: "remove", index: 0 }],
        run([{ type: "play", tracks: [t(1)] }]),
      );
      expect(s.tracks).toEqual([]);
      expect(s.index).toBe(-1);
    });
  });

  it("clear keeps the repeat mode", () => {
    const s = run([
      { type: "play", tracks: [t(1)] },
      { type: "cycleRepeat" },
      { type: "clear" },
    ]);
    expect(s.tracks).toEqual([]);
    expect(s.repeat).toBe("all");
  });

  it("restore brings the queue back paused at the saved position", () => {
    const s = run([
      {
        type: "restore",
        saved: { tracks: [t(1), t(2)], index: 5, repeat: "one" },
        resumeAt: 42,
      },
    ]);
    expect(s.index).toBe(1);
    expect(s.autoplay).toBe(false);
    expect(s.resumeAt).toBe(42);
    expect(s.repeat).toBe("one");
  });
});

describe("trackTitle", () => {
  it("takes the first non-empty line without markdown marks", () => {
    expect(trackTitle("\n**dharma-kṣetre** kuru-kṣetre\nsamavetā")).toBe(
      "dharma-kṣetre kuru-kṣetre",
    );
  });
  it("shortens long lines and falls back when empty", () => {
    expect(trackTitle("a".repeat(200))).toHaveLength(80);
    expect(trackTitle("  ", "Verse 3")).toBe("Verse 3");
  });
});

describe("audioFormat", () => {
  it("reads the extension past a query string", () => {
    expect(audioFormat("/api/assets/uploads/audios/x.wav?v=2")).toBe("wav");
    expect(audioFormat("/api/assets/stream/abc")).toBe("mp3");
  });
});
