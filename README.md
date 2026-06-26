# HandoverAI POC

Standalone proof of concept for **AI-assisted Sales → Ops handover checklist autofill**.

The first version proves this workflow:

1. Paste an email / quote text / meeting notes.
2. Click **Auto-fill checklist**.
3. Extract header fields and checklist rows.
4. Show status, confidence, and source evidence.
5. Generate TBC items, risk flags, suggested actions, and Ops summary.

This is intentionally independent from AHlogu.

## Tech stack

- Next.js App Router
- TypeScript
- OpenAI Responses API with Structured Outputs when `OPENAI_API_KEY` is supplied
- Local demo extractor fallback when no API key is supplied

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

## OpenAI setup

Add your key to `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```

Without `OPENAI_API_KEY`, the app still runs using the local rule-based demo extractor.

## What the POC currently supports

- Paste text source
- Upload `.txt`, `.eml`, `.csv`, `.md`, `.pdf`, `.docx`, `.xlsx`, `.xls`, `.html`
- Server-side parsing for PDF/DOCX/XLSX/EML before checklist extraction
- Extract checklist header fields
- Extract checklist rows
- Status classification: complete, pending, TBC, requires review, missing
- Evidence display
- Risk flags
- Suggested actions
- Ops summary

## Next features to add

### Phase 2 — Attachment parsing

Add parsers for:

- PDF quotes
- DOCX scopes
- XLSX itemised quotes
- EML email threads

Already added packages:

```bash
npm install pdf-parse mammoth xlsx mailparser
```

### Phase 3 — Save / review workflow

Add database:

- SQLite + Prisma for local POC, or
- Supabase Postgres for hosted demo

Tables:

- source_documents
- checklist_instances
- extracted_fields
- checklist_items
- ai_review_runs
- handover_actions

### Phase 4 — Human approval

Add buttons:

- Accept field
- Edit field
- Reject field
- Confirm checklist
- Submit to Ops

### Phase 5 — Export

Generate:

- PDF checklist
- Ops summary PDF
- Excel export matching the original template layout

## Main files

```text
src/app/page.tsx                 UI
src/app/api/extract/route.ts     extraction API
src/lib/template.ts              checklist template definition
src/lib/schema.ts                structured output JSON schema
src/lib/localExtractor.ts        fallback demo extractor
src/lib/types.ts                 shared TypeScript types
samples/sonac-handover-source.txt sample input
```

## Important design rule

The AI should not silently approve or overwrite the final handover checklist.

Every AI-filled value should keep:

- extracted value
- source document
- source evidence
- confidence
- status
- human review state later

