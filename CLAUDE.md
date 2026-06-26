# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HandoverAI POC — a Next.js web app that auto-fills a sales-to-operations handover checklist by extracting structured data from uploaded source documents (PDFs, DOCX, XLSX, EML, TXT, etc.) using the OpenAI API. All extractions include evidence, confidence, and status so humans can review before accepting.

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
# Set OPENAI_API_KEY (optional — app falls back to local rule-based extractor without it)
# Set OPENAI_MODEL (default: gpt-4o-mini)
```

## Architecture

### Data flow

```
File upload → /api/parse-sources → extractFileText() → combined text
                                                              ↓
                           User pastes text ─────────────────┘
                                                              ↓
                                        /api/extract → OpenAI structured output
                                                         (or local fallback)
                                                              ↓
                                              HandoverExtractionResult → UI
```

### Key files

| File | Purpose |
|---|---|
| `src/app/page.tsx` | Full UI — two-panel layout (source input / review summary) |
| `src/app/api/extract/route.ts` | Main extraction endpoint; calls OpenAI Responses API with `json_schema` format |
| `src/app/api/parse-sources/route.ts` | Multi-file upload parser; returns combined text |
| `src/lib/extractFileText.ts` | Format-specific parsers (PDF, DOCX, XLSX, EML, HTML, TXT) |
| `src/lib/localExtractor.ts` | Rule-based fallback extractor; no API key required |
| `src/lib/template.ts` | Checklist template definition (6 header fields, 12 checklist items) |
| `src/lib/schema.ts` | OpenAI JSON Schema for structured extraction |
| `src/lib/types.ts` | Shared TypeScript types for extraction results |

### The checklist template

"Advisory Project Critical Checklist — Rev 2.0" has two parts:
- **6 header fields**: Project Name, Customer, Salesperson, Est. Delivery Date, Pre-Fab/Install type, Payment Method
- **12 checklist items** across categories: Project Planning (scope, drawings, quote, schematic, site visit), Communications, Plant Area Info/Site Assessment (location, level, access, power, insulation), Commissioning

### Extraction result shape (`HandoverExtractionResult`)

```typescript
{
  templateName, templateRevision, extractionMode,  // "ai" | "local_demo"
  headerFields[],    // HeaderFieldExtraction — value, status, confidence, evidence
  checklistItems[],  // ChecklistItemExtraction — status, comments, evidence
  review: {
    overallStatus, riskLevel, executiveSummary,
    tbcItems[], missingItems[], riskFlags[], suggestedActions[], opsSummary
  }
}
```

### Design invariants

- Every extracted value carries: source document, evidence text snippet, confidence (`high | medium | low`), and status.
- The AI must not invent values or convert scope (e.g. supply-only → installation). Flag conflicts rather than resolving them.
- The local extractor (`localExtractor.ts`) must remain a complete demo-capable fallback — don't couple it to the OpenAI path.

## Roadmap context

Phase 1 (current) is stateless — no DB, no auth, no persistence. Phases 2–5 plan to add: SQLite/Postgres via Prisma or Supabase, save/review history, human approval UI, and PDF/Excel export.
