# Resumine

An offline desktop CV builder for Windows. Write your CV once, tailor it per job,
and export a PDF that looks designed — no account, and the export button is
never paywalled.

## Why it works the way it does

Everything is rendered as **real A4 pages**, not a scrolling div. The preview
and the exported PDF share one rendering pipeline (`src/lib/cvHtml.js` →
`src/lib/paginate.js`): blocks are measured at print width, packed into fixed
pages, and the same packed pages go to both the screen and `printToPDF`. The
page break you see is the page break you get.

## Getting started

```bash
npm install
npm run dev
```

## Data

Everything lives in the app's user-data folder — `cv.json` plus timestamped
snapshots under `history/`. Nothing touches the network; the renderer's CSP
forbids it in production.

A document holds the master CV plus **versions**: named, tailored copies that
share the master's data. Each version can hide sections, reorder them, rename
headings and override the summary. Fix a typo in the master and it fixes
every version.

## Export

- **PDF** — vector text via Chromium `printToPDF` (selectable, searchable,
  fonts embedded).
- **Plain text** — for paste-into-a-form applications.
- **JSON** — the whole document, so data is never locked in.

## Status

Phase 1–3 implemented: data model, section editors, autosave + history,
live paginated preview with page-count and spill warnings, six templates,
density slider, print-safe accent palette, PDF/text/JSON export.

Not yet: DOCX export, ATS checklist panel, job-description keyword matching,
cover letter builder, PDF/DOCX import, licensing.
