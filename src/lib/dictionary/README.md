# Dictionaries

Dictionary data moves through three stages:

```
data/dict/*.sqlite ──capture──▶ DictRawEntries ──build──▶ DictWords
source files                    originals, verbatim       search entries
                                + DictSources (one per dictionary)
```

- **Originals** (`DictRawEntries`) hold every row of a dictionary's source
  table exactly as it is in the file, keyed by a stable key: `lnum` where it
  is unique (Cologne dictionaries), otherwise the SQLite `rowid` (Brown,
  Gwynn, eng2te, eng2en, dhātupāṭha). Each row carries a hash, so capturing
  again reports new / changed / unchanged / removed rows and only writes what
  changed. Small companion tables (abbreviations, cited authorities, MW root
  tables, dhātupāṭha notes) are kept on the dictionary's `DictSources` record.
- **Search entries** (`DictWords`) are what every lookup reads: the dictionary
  page, the popup, the Sanskrit playground nodes and the suggestion provider.
  Each is built from one original by `buildEntryFromRaw` and records
  `sourceKey` (its original), `processorVersion`, and `searchText` — every
  distinct word of the headword and the *whole* meaning in every script, for
  the full-text index (`dict_fulltext_idx`). `searchText` is never returned to
  readers.

## Running it

In the app: **Scraper → Dictionaries** (admins). Each dictionary shows its
three stages and the one next step (Capture & build, Rebuild…). Jobs run one
batch per request from the browser, with progress, cancel and resume.
**Inspect** looks through the originals by headword (any script), key or text,
and compares an original with its live entry and with what a rebuild would
make of it now. An entry's page links to its original.

From the command line (same code):

```bash
pnpm dict:pipeline mw ap90          # capture, then build
pnpm dict:pipeline all --build      # rebuild everything from stored originals
pnpm dict:pipeline --status
pnpm dict:pipeline --indexes        # create the search indexes
```

## Guarantees

- **Nothing live changes until a build is complete.** Entries are built under
  `__import__<ORIGIN>`, then swapped in; the previous entries are parked under
  `__old__<ORIGIN>` until the swap is done, so an interrupted swap can be
  recovered. Lookups ignore every origin starting with `__`.
- **Hand edits survive rebuilds.** Editing or adding an entry sets
  `editedAt`; a rebuild keeps those entries (switch off in Run settings).
- **Rebuilding never needs the source file.** Change the processing rules,
  bump `DICTIONARY_PROCESSOR_VERSION` in `dictionary-processor.ts`, and the
  manager flags every dictionary built by an older version.
- **Entries from the old importer** (whole source row in `sourceData.data`)
  can be turned into originals with *Keep originals from entries*, so they can
  be rebuilt even without their SQLite file.

## Backups

`/api/dictionary/export?format=…&origins=MW,AP90`

| format      | contents                                                   | restore result                 |
| ----------- | ---------------------------------------------------------- | ------------------------------ |
| `originals` | every original row + source details + companion tables     | originals (then build)         |
| `backup`    | search entries as they are now, hand edits included        | search entries (staged swap)   |
| `csv`       | headword in every script + meaning in one language         | —                              |

`/api/dictionary/restore?mode=replace|merge[&only=MW]` accepts either backup
(gzipped or plain) and tells them apart by the header line.

## Modules

| file                         | role                                                        |
| ---------------------------- | ----------------------------------------------------------- |
| `dictionary-sources.ts`      | which file/table/key/order each dictionary uses; reads rows |
| `dictionary-processor.ts`    | original row → entry (pure); `DICTIONARY_PROCESSOR_VERSION` |
| `dictionary-pipeline.ts`     | capture, build, swap, inspect, indexes, overview            |
| `dictionary-backup.ts`       | search-entry backup format                                  |
| `lookup-query.ts` / `lookup-service.ts` | reader-facing search                             |
| `scripts/dictionary-pipeline-cli.ts` | `pnpm dict:pipeline`                                |

## Notes on the source files

- `eng2en.sqlite` and `eng2te.sqlite` are the same file (both tables in
  each); ENG2TEL reads table `eng2te`, ENG2ENG reads table `entries`.
- `macdonell_san.sqlite` is another digitisation of Macdonell (MD); it is not
  imported. `mwkeys.sqlite` (194k rows) is an MW key index and is not kept.
- Brown and Gwynn repeat `lnum`, so they are keyed by rowid. Gwynn's
  romanisation (aa/ii/uu/ee/oo long, w = v, c = ch, ś, S = ṣ) is converted to
  Telugu by `gwynnToItrans`; the original spelling is kept as the `ENG` form.
