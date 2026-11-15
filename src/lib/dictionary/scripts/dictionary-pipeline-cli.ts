#!/usr/bin/env tsx
/**
 * Dictionary pipeline from the command line: the same steps as Scraper →
 * Dictionaries, for large loads or servers without the page open.
 *
 *   pnpm dict:pipeline <dict…|all> [--capture] [--build] [--batch=2000]
 *                                  [--overwrite-edits] [--indexes] [--status]
 *
 *   (no step flags)   capture originals from data/dict, then build entries
 *   --capture         only capture originals (SQLite → DictRawEntries)
 *   --build           only build search entries from the stored originals
 *   --indexes         create the search indexes first
 *   --status          print the state of every dictionary and exit
 *
 * Examples:
 *   pnpm dict:pipeline mw ap90
 *   pnpm dict:pipeline all --build
 */

import { DictionaryName, LEXICON_ALL_DICT } from "../dictionary-constants";
import * as pipeline from "../dictionary-pipeline";
import { readSourceInfo, sourceSpec } from "../dictionary-sources";
import { db } from "@/lib/db";

function parse() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")).map((a) => a.split("=")[0]));
  const batch = Number(args.find((a) => a.startsWith("--batch="))?.split("=")[1] ?? 2000);
  const names = args.filter((a) => !a.startsWith("--"));
  const dicts: DictionaryName[] =
    names.length === 0 || names.includes("all")
      ? [...LEXICON_ALL_DICT]
      : names.map((n) => {
          if (!(LEXICON_ALL_DICT as readonly string[]).includes(n)) {
            throw new Error(`Unknown dictionary "${n}". Known: ${LEXICON_ALL_DICT.join(", ")}`);
          }
          return n as DictionaryName;
        });
  const onlyCapture = flags.has("--capture");
  const onlyBuild = flags.has("--build");
  return {
    dicts,
    capture: onlyCapture || !onlyBuild,
    build: onlyBuild || !onlyCapture,
    batch: Math.min(Math.max(batch, 100), 5000),
    keepEdits: !flags.has("--overwrite-edits"),
    indexes: flags.has("--indexes"),
    status: flags.has("--status"),
  };
}

const fmt = (n: number) => n.toLocaleString();

function progress(label: string, done: number, total: number, started: number) {
  const pct = total ? ((done / total) * 100).toFixed(1) : "100";
  const secs = (Date.now() - started) / 1000;
  process.stdout.write(`\r  ${label} ${fmt(done)}/${fmt(total)} (${pct}%) ${secs.toFixed(0)}s   `);
}

async function capture(dict: DictionaryName, batch: number) {
  const origin = pipeline.originFor(dict);
  const begin = await pipeline.beginCapture(dict);
  const started = Date.now();
  const totals = { added: 0, changed: 0, unchanged: 0 };
  let done = 0;
  while (done < begin.total) {
    const r = await pipeline.captureBatch(dict, begin.runId, done, batch, begin.signature);
    if (r.read === 0) break;
    done += r.read;
    totals.added += r.added;
    totals.changed += r.changed;
    totals.unchanged += r.unchanged;
    progress("capture", done, begin.total, started);
  }
  const fin = await pipeline.finishCapture(origin, begin.runId, {
    complete: true,
    signature: begin.signature,
    sourceFile: sourceSpec(dict).file,
  });
  console.log(
    `\n  originals: ${fmt(fin.rawCount)} (${fmt(totals.added)} new, ${fmt(totals.changed)} changed, ` +
      `${fmt(totals.unchanged)} unchanged, ${fmt(fin.removed)} removed), key ${begin.keyColumn}`,
  );
}

async function build(dict: DictionaryName, batch: number, keepEdits: boolean) {
  const origin = pipeline.originFor(dict);
  const begin = await pipeline.beginBuild(origin, { resume: true });
  const started = Date.now();
  let cursor = begin.cursor;
  let nextIndex = begin.nextIndex;
  let done = begin.done;
  let failed = 0;
  const errors: string[] = [];
  if (begin.done) console.log(`  resuming after ${fmt(begin.done)} rows`);
  while (done < begin.total) {
    const r = await pipeline.buildBatch(origin, cursor, nextIndex, batch);
    if (r.read === 0) break;
    done += r.read;
    cursor = r.cursor;
    nextIndex = r.nextIndex;
    failed += r.failed;
    errors.push(...r.errors.slice(0, 5 - errors.length));
    progress("build", done, begin.total, started);
  }
  const fin = await pipeline.finishBuild(origin, { keepEdits });
  console.log(
    `\n  entries: ${fmt(fin.entryCount)}${fin.kept ? `, ${fmt(fin.kept)} hand edits kept` : ""}` +
      `${failed ? `, ${fmt(failed)} rows failed` : ""}`,
  );
  for (const e of errors) console.log(`    ! ${e}`);
}

async function status() {
  const rows = await pipeline.pipelineOverview();
  console.log("origin".padEnd(12), "file".padStart(9), "originals".padStart(10), "entries".padStart(9), " state");
  for (const r of rows) {
    const state = [
      r.originals.sourceChanged && "source changed",
      r.entries.outdated && "rebuild",
      r.entries.staged && `${r.entries.staged} staged`,
      r.entries.parked && `${r.entries.parked} parked`,
    ]
      .filter(Boolean)
      .join(", ");
    console.log(
      r.origin.padEnd(12),
      String(r.file?.rows ?? "-").padStart(9),
      String(r.originals.count).padStart(10),
      String(r.entries.count).padStart(9),
      "",
      state || "ok",
    );
  }
  const idx = await pipeline.indexStatus();
  console.log(idx.ok ? "\nindexes ok" : `\nindexes: missing ${idx.missing.join(", ")} ${idx.conflicting.join(", ")}`);
}

async function main() {
  const opts = parse();
  if (opts.status) return status();
  if (opts.indexes) {
    console.log("Creating search indexes…");
    const s = await pipeline.ensureIndexes();
    console.log(s.ok ? "  indexes ok" : `  still missing: ${s.missing.join(", ")}`);
  }
  for (const dict of opts.dicts) {
    console.log(`\n${dict.toUpperCase()}`);
    try {
      if (opts.capture) {
        const info = readSourceInfo(dict);
        if (!info.exists) console.log(`  no source file (${info.file}); skipping capture`);
        else await capture(dict, opts.batch);
      }
      if (opts.build) await build(dict, opts.batch, opts.keepEdits);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`\n  failed: ${msg}`);
      await pipeline.recordError(pipeline.originFor(dict), msg);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
