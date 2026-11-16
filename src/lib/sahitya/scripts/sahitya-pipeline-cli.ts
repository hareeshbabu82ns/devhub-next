#!/usr/bin/env tsx
/**
 * Sanskrit Sahitya pipeline from the command line: the same steps as
 * Scraper → Sanskrit Sahitya, for large works or servers without the page.
 *
 *   pnpm sahitya:pipeline <work…|all> [--capture] [--build] [--type=KAVYAM]
 *                         [--parent=<entityId>] [--batch=500] [--overwrite-edits]
 *   pnpm sahitya:pipeline --status
 *
 *   (no step flags)   capture originals, then build entities
 *   --capture         only capture (source JSON → SahityaRawRecords)
 *   --build           only build entities from the stored originals
 *   --changed         with "all": only works whose source changed or that
 *                     need a rebuild
 *
 * Examples:
 *   pnpm sahitya:pipeline meghadutam
 *   pnpm sahitya:pipeline ramayanam --type=ITIHASAM
 *   pnpm sahitya:pipeline all --changed
 */

import { db } from "@/lib/db";
import * as pipeline from "../sahitya-pipeline";

function parse() {
  const args = process.argv.slice(2);
  const flag = (name: string) => args.some((a) => a === `--${name}`);
  const value = (name: string) =>
    args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  const onlyCapture = flag("capture");
  const onlyBuild = flag("build");
  return {
    works: args.filter((a) => !a.startsWith("--")),
    capture: onlyCapture || !onlyBuild,
    build: onlyBuild || !onlyCapture,
    status: flag("status"),
    changed: flag("changed"),
    overwriteEdited: flag("overwrite-edits"),
    entityType: value("type"),
    parentId: value("parent"),
    batchSize: Math.min(Math.max(Number(value("batch") ?? 500), 50), 2000),
  };
}

async function main() {
  const opts = parse();
  const rows = await pipeline.overview();

  if (opts.status || opts.works.length === 0) {
    for (const r of rows) {
      if (r.kind !== "work") {
        console.log(`  ${r.work.padEnd(26)} reference data`);
        continue;
      }
      const state = [
        r.capturedAt ? `${r.rawCount} originals` : "not captured",
        r.sourceChanged ? "SOURCE CHANGED" : "",
        r.builtAt ? `${r.entityCount} entities` : r.capturedAt ? "not built" : "",
        r.needsBuild && r.builtAt ? "NEEDS REBUILD" : "",
        r.unhandledFields.length ? `unhandled: ${r.unhandledFields.map((f) => f.field).join(",")}` : "",
        r.legacy.length ? `earlier import: ${r.legacy.map((l) => l.id).join(",")}` : "",
      ].filter(Boolean);
      console.log(`  ${r.work.padEnd(26)} ${state.join(" · ")}`);
    }
    if (opts.works.length === 0 && !opts.status) {
      console.log("\nGive work names (or 'all') to capture and build them.");
    }
    return;
  }

  let works = opts.works.includes("all")
    ? rows.filter((r) => r.kind === "work").map((r) => r.work)
    : opts.works;
  if (opts.changed) {
    const byWork = new Map(rows.map((r) => [r.work, r]));
    works = works.filter((w) => {
      const r = byWork.get(w);
      return !r || !r.capturedAt || r.sourceChanged || r.needsBuild;
    });
  }

  for (const work of works) {
    console.log(`\n== ${work}`);
    try {
      if (opts.capture) {
        const c = await pipeline.captureWork(work, (r, i, n) =>
          console.log(
            `  capture ${i + 1}/${n} ${r.file}: ${r.rows} rows (${r.added} new, ${r.changed} changed)`,
          ),
        );
        console.log(`  originals: ${c.total}, ${c.removed} no longer in the source`);
      }
      if (opts.build) {
        let last = 0;
        const b = await pipeline.buildWork(
          work,
          {
            entityType: opts.entityType,
            parentId: opts.parentId,
            overwriteEdited: opts.overwriteEdited,
            batchSize: opts.batchSize,
          },
          (_r, done, total) => {
            const pct = Math.floor((done / total) * 100);
            if (pct >= last + 10 || done === total) {
              last = pct;
              console.log(`  build ${done}/${total}`);
            }
          },
        );
        console.log(
          `  entities: ${b.entities} (${b.created} new, ${b.updated} updated, ${b.unchanged} unchanged, ${b.kept} kept as edited, ${b.removedEntities} removed), ${b.annotations} annotations; root ${b.rootEntityId}`,
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await pipeline.recordError(work, msg);
      console.error(`  failed: ${msg}`);
      process.exitCode = 1;
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
