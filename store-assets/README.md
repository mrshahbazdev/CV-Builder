# Resumine — Microsoft Store assets

## Identity (Partner Center)

- Package/Identity/Name: `MuhammadShahbaz.Resumine`
- Package/Identity/Publisher: `CN=82C2C857-730F-4239-B80D-4F1C7E03E8B4`
- PublisherDisplayName: `Muhammad Shahbaz`
- Package Family Name: `MuhammadShahbaz.Resumine_rr0dytgfqn7gw`
- Store ID: `9NXCBJ5VHJQZ`

These values are wired into `package.json → build.appx`. Build the AppX on a
Windows machine: `npm run dist:win` (electron-builder produces both the NSIS
installer and the `.appx`).

## Icons & logos

`build/` contains the icon set electron-builder picks up automatically:

- `icon.png` (1024×1024) + `icon.ico` (16–256 px) — installer & app icon
- `Square44x44Logo.png`, `Square150x150Logo.png`, `Square310x310Logo.png`,
  `Wide310x150Logo.png`, `StoreLogo.png` — Store tile assets
- `icon_src.png` — original 1024×1024 artwork

## Screenshots

`screenshots/` — 1366×768 PNGs of the real app, in suggested listing order:

1. `01-welcome.png` — first-run chooser (sample / blank / import)
2. `02-editor-and-preview.png` — editor + live paginated A4 preview
3. `03-sidebar-template.png` — two-column template with coloured rail
4. `04-design-pane.png` — 8 templates, density slider, accent palette
5. `05-ats-jd-match.png` — ATS checklist + job-description keyword match
6. `06-tailored-versions.png` — named versions with hide/reorder controls
7. `07-cover-letter.png` — cover letter sharing the CV's template

## Listing copy (draft)

**Title:** Resumine — CV & Resume Builder

**Short description:**
Write your CV once, tailor it per job, and export a PDF that looks designed —
without uploading your career history to a website that holds the download
hostage.

**Description:**
Free PDF export, no account, no subscription. Your CV never leaves your
computer.

Resumine is an offline desktop CV builder. Write once, keep one master CV, and
create tailored versions for each job — hiding, reordering and trimming
sections without touching the original.

- Live, paginated A4 preview with real page breaks and a page-count warning
- 8 genuinely different templates — Classic, Modern, Minimal, Sidebar,
  Compact, Academic, Creative, Technical
- ATS check: an honest, rule-based checklist that says what is wrong and how
  to fix it — plus keyword matching against a pasted job description
- Exports: PDF (vector, selectable text), DOCX with real styles, plain text,
  JSON
- Cover letter builder that shares your CV's template and header
- Import an existing CV from PDF, DOCX or JSON to start in one click
- Fully offline: no accounts, no cloud, no telemetry

**Keywords:** resume builder, cv maker, resume template, cover letter, ats resume
