# Sanskrit Sahitya

Texts from [sanskritsahitya.org](https://sanskritsahitya.org), via its data
repository checked out at `data/sanskritsahitya-com-data`
(`git clone https://github.com/hareeshbabu82ns/sanskritsahitya-com-data.git`,
or set `SAHITYA_DATA_DIR`), move through two stages:

```
<work>/<work>.json ──capture──▶ SahityaRawRecords ──build──▶ Entities
<work>/<work>1..N.json          originals, verbatim         + EntityAnnotations
                                + SahityaSources (one per work)
```

- **Originals** (`SahityaRawRecords`) hold every book, chapter and data row of
  a work exactly as in the source, with a hash. The header (title, `custom`,
  `terms`, books, chapters and any key added later) is kept on the work's
  `SahityaSources` record, together with a count of every row field, the file
  signature and the data repo's git commit. Capturing again reports new /
  changed / unchanged / removed rows and writes only what changed.
- **Entities** are built from the originals by `sahitya-processor.ts`. Each
  original remembers the entity it built (`entityId`) and a hash of what was
  written (`builtHash`), so a rebuild **updates entities in place**:
  bookmarks, notes, audio, playgrounds and your own annotations stay, and an
  entity whose text / meaning / attributes were edited by hand is left alone
  (unless *Overwrite edited* is on).

## Running it

In the app: **Scraper → Sanskrit Sahitya: capture & build** (admins). Every
folder of the data repo is listed, with its state and the next step
(Capture & build, Rebuild…). **Preview** shows what the current processor
makes of any verse (entity, annotations, source row) before anything is
written. Works brought in by the earlier importer are flagged so they can be
deleted after building the new one.

```bash
pnpm sahitya:pipeline --status
pnpm sahitya:pipeline meghadutam             # capture, then build
pnpm sahitya:pipeline ramayanam --build      # rebuild from stored originals
pnpm sahitya:pipeline all --changed          # whatever changed upstream
pnpm db:push                                 # once: collections + indexes
```

## Where each field goes

| source                                   | becomes                                                    |
| ---------------------------------------- | ---------------------------------------------------------- |
| `title`, book / chapter `name`           | entity text (Devanagari + IAST, SLP1, ITRANS, Telugu)       |
| chapter without a name                   | `terms.chapterSg` + number, e.g. "अध्यायः 1.1"               |
| `subtitle`, `es` / `ens` on books, chapters | meaning (ENG): subtitle in bold, then the summary        |
| `v` verse / `t` prose                    | text, a line break after every `।`, `॥` and `॥ १२ ॥`; prose gets `textKind=prose` |
| `sp` speaker                             | `speaker` attribute and a bold prefix on the text           |
| `ch.n` metre                             | `chandas` attribute and a `CHANDAS` annotation: the verse scanned into pādas, guru / laghu, gaṇas and mātrās (`sahitya-chandas.ts`; upstream dropped `ch.s` in July 2025, it is used when present) |
| English `custom` fields (`es`, `md`, `et`…) | meaning (ENG), headed by name when there are several     |
| Sanskrit `custom` fields (`mn`, `vd`, `am`, `mr`, `sc`…) | `COMMENTARY` annotation titled with the commentator |
| `anv`                                    | `ANVAYA` annotation                                        |
| `pc` padaccheda                          | `WORD_MEANING` annotation: word, analysis, English gloss    |
| `xx` morphology                          | `WORD_ANALYSIS` annotation: word, lemma, decoded grammar    |
| `aiGenerated` in `custom`                | `aiGenerated` attribute listing those fields; "(AI)" on annotation titles |
| `c`, `n`                                 | `chapterNumber`, `verseNumber`, `ssRef` ("1.1.4"), `sourceUrl` |
| `i` (deprecated index)                   | kept in the original only                                   |
| anything else, plain value               | `src.<field>` attribute (listed as "without a rule")        |

Every built entity carries `sourceType=sanskritsahitya`, `ssWork` and `ssKey`
(its original). Annotations written by a build carry
`source="sanskritsahitya:<field>"` and are replaced on rebuild; editing one
by hand clears `source`, so it is kept from then on.

## Keys and structure

- Books `b:<number>`, chapters `c:<number>`, verses `v:<c>:<n>` (the site's
  address), prose `t:<c>:<verse it follows>:<k>`. A repeated key gets `#2`…
  Keys stay stable when text around a verse changes, so entities keep their
  identity across re-captures.
- Books sit under the work; chapter "3.1" under book 3 (or chapter 3 when
  there are no books); rows under their chapter, else the book or longest
  dotted prefix, else the work. `planStructure` decides it at the start of a
  build, so changing the rules needs only a rebuild.
- Types: the work's type is chosen at build time (suggested per work in
  `WORK_ROOT_TYPES`); books and chapters follow `terms.bookSg` /
  `terms.chapterSg` (`BOOK_TYPES`, `CHAPTER_TYPES`); rows are `SLOKAM`.

## Extending

When the source adds something:

1. Re-capture. New keys show up under "Fields without a rule" in the manager
   (and in `--status`). Nothing is lost meanwhile: the original is stored and
   plain values already land in `src.<field>` attributes.
2. Give the field a home in `sahitya-fields.ts`:
   - a new commentary or translation declared in `custom` needs nothing —
     English goes to meaning, Sanskrit to a COMMENTARY; add it to
     `FIELD_RULES` only to send it somewhere else (`target`);
   - a structured field gets a handler in `ROW_FIELD_HANDLERS`;
   - a new word for book / chapter gets a type in `BOOK_TYPES` /
     `CHAPTER_TYPES`; a new annotation kind goes in `src/lib/annotations.ts`.
3. Bump `SAHITYA_PROCESSOR_VERSION` and rebuild. The manager flags every work
   built by an older version.

Folders that are not texts (`chhanda`, `dhatu`, `kosha`, `ashtadhyayi`) are
listed as reference data; dhatus and lexicons are handled by the dictionary
pipeline.

## Modules

| file                         | role                                                       |
| ---------------------------- | ---------------------------------------------------------- |
| `sahitya-format.ts`          | source format, header checks, record keys, hashing         |
| `sahitya-fields.ts`          | field rules and handlers, grammar code decoding            |
| `sahitya-chandas.ts`         | syllables, guru / laghu, pādas, gaṇas of a verse           |
| `sahitya-processor.ts`       | original → entity (pure), structure plan, types; version   |
| `sahitya-sources.ts`         | finding works and shards in the data folder, reading files |
| `sahitya-pipeline.ts`        | capture, build, delete, overview, preview                  |
| `scripts/sahitya-pipeline-cli.ts` | `pnpm sahitya:pipeline`                              |
