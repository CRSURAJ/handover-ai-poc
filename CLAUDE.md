# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The app is AI-only. There is no offline/local extractor.

HandoverAI POC — a Next.js web app that auto-fills a sales-to-operations handover checklist by extracting structured data from uploaded source documents (PDFs, DOCX, XLSX, EML, TXT, etc.) using the OpenAI Responses API with strict JSON schema output. All extractions carry evidence, confidence, and status so humans can review before accepting.

## Commands

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript type check (tsc --noEmit)
```

**Environment setup:**
```bash
cp .env.example .env.local
# OPENAI_API_KEY — required, no fallback
# OPENAI_MODEL   — default: gpt-4.1-mini
```

## Architecture

### Data flow

```
File upload → /api/parse-sources → extractBufferText() → combined source text
                                                                  ↓
                              User pastes text ───────────────────┘
                                                                  ↓
                                            /api/extract → buildExtractionPrompt()
                                                                  ↓
                                                   OpenAI Responses API (json_schema)
                                                                  ↓
                                               parseHandoverExtractionResult() (validate)
                                                                  ↓
                                                    HandoverExtractionResult → UI
```

### Key files

| File | Purpose |
|---|---|
| `src/app/page.tsx` | Root UI — two-panel layout (source input / review summary) |
| `src/app/api/extract/route.ts` | Extraction endpoint; delegates to `runOpenAIExtraction()` |
| `src/app/api/parse-sources/route.ts` | Multi-file upload endpoint (Node.js runtime, 60 s timeout) |
| `src/lib/extractFileText.ts` | Format-specific parsers: pdf-parse / mammoth / xlsx / mailparser / regex |
| `src/lib/parseSourceFiles.ts` | Orchestrates file validation, parsing, and `buildCombinedSourceText()` |
| `src/lib/buildExtractionPrompt.ts` | System + user prompt; enforces extraction rules; max 120 000 chars |
| `src/lib/runOpenAIExtraction.ts` | OpenAI Responses API call (`client.responses.create`) + JSON parse |
| `src/lib/validateHandoverResult.ts` | Runtime type guards — second validation layer after OpenAI strict schema |
| `src/lib/template.ts` | Checklist template constants (source of truth for all schema + prompt generation) |
| `src/lib/schema.ts` | OpenAI JSON Schema (strict mode) derived from `template.ts` |
| `src/lib/types.ts` | Shared TypeScript types for extraction results |
| `src/lib/sourceFileConfig.ts` | Upload constraints: 10 files max, 20 MB each, allowed extensions |
| `src/hooks/useHandoverExtraction.ts` | React state hook; orchestrates upload, extraction, reset, export |
| `src/lib/handoverApiClient.ts` | Fetch wrappers for `/api/extract` and `/api/parse-sources` |

### The checklist template

"Advisory Project Critical Checklist — Rev 2.0" has two parts:
- **6 header fields**: Project Name, Customer, Salesperson, Est. Delivery Date, Pre-Fab/Install type, Payment Method
- **12 checklist items** across categories: Project Planning (scope, drawings, quote, schematic, site visit), Communications, Plant Area Info/Site Assessment (location, level, access, power, insulation), Commissioning

The array lengths (6 and 12) are enforced in both the OpenAI JSON schema and the runtime validator. Changing the template requires updating `template.ts`, `schema.ts`, and `validateHandoverResult.ts` in sync.

### Extraction result shape (`HandoverExtractionResult`)

```typescript
{
  templateName, templateRevision, extractionMode,  // always "ai"
  headerFields[],    // HeaderFieldExtraction — value, status, confidence, sourceName, evidenceText, reasoningNote
  checklistItems[],  // ChecklistItemExtraction — suggestedStatus, comments, remarks, handoverMeetingNotes, confidence, sourceName, evidenceText, reasoningNote
  review: {
    overallStatus, riskLevel, executiveSummary,
    tbcItems[], missingItems[], riskFlags[], suggestedActions[], opsSummary
  }
}
```

Status enums: `FieldStatus` = `"filled" | "missing" | "needs_review" | "conflict"`. `ChecklistStatus` = `"complete" | "pending" | "tbc" | "requires_review" | "critical_issue" | "not_applicable" | "not_started"`.

### Design invariants

- Every extracted value carries: source document name, evidence text snippet, confidence (`high | medium | low`), and status.
- The AI must not invent values or convert scope (e.g. supply-only → installation). Flag conflicts rather than resolving them.
- Source text is silently truncated to **120 000 chars** before being sent to OpenAI — data beyond that point will not be extracted.
- Validation happens at two layers: (1) OpenAI `strict: true` JSON schema at generation time, (2) `assertHandoverExtractionResult()` runtime type guards on the response.

### Non-obvious behaviours

- **EML attachment recursion**: the email parser recursively extracts supported attachment types (PDF, DOCX, XLSX, TXT) and appends their text to the email body. A failed attachment parse logs a warning but does not abort the overall parse.
- **File input reset**: `useHandoverExtraction` increments `fileInputKey` on reset to force React to unmount/remount the `<input type="file">` element — the only reliable way to clear browser file selection state. The `key={fileInputKey}` prop on the file input must be preserved.
- **XLSX multi-sheet**: all sheets are extracted as separate labelled sections and linearised into a single text block.
- **sourceName** for multi-file uploads is a comma-separated list of filenames (`"file1.pdf, file2.docx"`), used in the prompt and export filename.

### Error handling

Three custom API error classes set specific HTTP status codes:

| Class | Status | When |
|---|---|---|
| `ExtractionApiError` | 500 (config) / 502 (bad response) | OpenAI call failures |
| `SourceParsingApiError` | 400 (input) / 500 (parse error) | File upload/parsing failures |
| `RequestApiError` | 400 | Invalid extract request body |

All API error responses are `{ error: string, detail?: string }`.

File parsing is resilient — if a single file parser fails, that file is returned with a warning flag rather than aborting the whole upload.

## Roadmap context

Phase 1 (current) is stateless — no DB, no auth, no persistence. Phases 2–5 plan to add: SQLite/Postgres via Prisma or Supabase, save/review history, human approval UI, and PDF/Excel export. Adding human approval will require extending the types (currently `extractionMode` is always `"ai"`).
