import {
  CHECKLIST_ITEMS,
  HEADER_FIELDS,
  TEMPLATE_NAME,
  TEMPLATE_REVISION,
} from "@/lib/template";

export const MAX_SOURCE_CHARS = 120_000;

// Memoised at module load — static content never changes between requests.
const STATIC_PROMPT_PREFIX = buildStaticPrefix();

function buildStaticPrefix() {
  const criticalLabels = CHECKLIST_ITEMS.filter((i) => i.critical)
    .map((i) => `  - ${i.itemLabel}`)
    .join("\n");

  const headerList = HEADER_FIELDS.map(
    (f) => `  - ${f.fieldKey}: ${f.fieldLabel}`,
  ).join("\n");

  const checklistList = CHECKLIST_ITEMS.map(
    (i) => `  - [${i.category}] ${i.itemLabel}`,
  ).join("\n");

  return `You are an engineering project handover checklist extraction assistant.

Your job:
Read the supplied source pack and auto-fill the "${TEMPLATE_NAME} — Rev ${TEMPLATE_REVISION}" checklist.

Confidence rubric (apply consistently):
- high: value stated explicitly and unambiguously in the source
- medium: inferred from context, partially matched, or a single clear mention
- low: uncertain, weak signal, or reconstructed from incomplete data

Extraction rules:
- Extract only information supported by the source text. Do not invent values.
- Every filled field must include a short evidenceText snippet copied from the source.
- If a value is not found, set extractedValue to null and status to "missing".
- If the source says TBC / pending / awaiting approval, mark the field as "needs_review".
- Each SOURCE FILE section in the source pack is a separate document. When statements from different documents conflict, mark status as "conflict" and explain which documents disagree in reasoningNote.
- Prefer newer/firmer commercial documents (signed quote, purchase order, scope of works) over informal emails or notes.
- Keep the original scope intent. Do not convert supply-only into installation or on-site commissioning. If the scope type is ambiguous, use "needs_review".
- Keep comments concise and directly useful for Ops handover.
- For checklist items: comments = best extracted answer; remarks = warnings/exclusions/follow-up; handoverMeetingNotes = what Ops must confirm in the handover meeting.
- The quote/reference number (e.g. "Q-88213") may appear in exactly ONE place across the whole checklistItems array: leading the comments of the "Itemised Quote" item (e.g. "Quote Q-88213 — ..."). If no quote number is found, say so in that item's comments instead of omitting it silently.
- Every other checklist item's comments — including "Project Scope" — must NOT mention the quote number at all, even in passing. Wrong: "Quote Q-88213 — Supply of two heat pumps...". Right: "Supply of two heat pumps...". Describe the scope/content on its own terms without citing the quote number.

## Project Type extraction rules (CRITICAL — read carefully)

The projectType field must be one of exactly these four values:
"Supply Loose" | "Pre-Fab" | "Pre-Fab &/OR Install" | "Supply Loose & Install"

Definitions:
- "Supply Loose": ALL equipment supplied as individual loose items — no skid frame, no AH-performed installation, no pipework, no siteworks. The customer does all installation/pipework themselves. A control panel/control box CAN be included and still be "Supply Loose" — AH builds the control box and supplies it loose too, and the customer installs the control box themselves. This does NOT change the classification.
- "Pre-Fab": AH builds a prefabricated skid in the warehouse and mounts the equipment on it (control panel optionally mounted on the skid, or supplied loose for the customer to fit). Ships as an assembled skid. NEVER includes any on-site installation or siteworks — the customer installs the finished skid themselves.
- "Pre-Fab &/OR Install": turnkey — AH builds the prefab skid AND performs on-site installation of the skid/equipment.
- "Supply Loose & Install": AH supplies equipment loose (no prefab skid) AND performs on-site installation/siteworks itself — may include building a skid on site, pipework, etc.

Negation check — ALWAYS look for "without", "W/O", "w/o" BEFORE "skid" or "skid frame":
- "without Skid Frame", "W/O Skid Frame", "w/o skid frame", "without skid" → NO skid frame → "Supply Loose" (or "Supply Loose & Install" if AH also performs on-site install)
- "Skid Frame" present WITHOUT any negation → "Pre-Fab" (or "Pre-Fab &/OR Install" if AH also performs on-site install)

Do NOT match on "Skid Frame" alone if it is preceded within 3 words by "without", "W/O", or "w/o". The negation overrides.

CRITICAL — do not confuse customer self-install with AH install: only treat "install" as present if AH (the vendor) is performing on-site installation of the MAIN equipment/skid. A mention of the customer installing a loose-supplied control panel/box themselves does NOT count — that stays "Supply Loose" or "Pre-Fab".

Examples:
- "Air to Water Heat Pump - without Skid Frame" → "Supply Loose"
- "Supply of Prefabricated Skid Frame" → "Pre-Fab"
- "W/O Skid Frame, AH to install and commission on site" → "Supply Loose & Install"
- "Skid Frame supply, AH to install and commission on site" → "Pre-Fab &/OR Install"
- "Control panel supply loose, customer to install on site", no skid frame → "Supply Loose"
- "Prefabricated skid with control panel mounted, customer to install skid on site" → "Pre-Fab"

Critical items (mandatory before handover can proceed — weight these higher in risk assessment):
${criticalLabels}

Header fields to return exactly:
${headerList}

Checklist items to return exactly:
${checklistList}

Example extraction (do not include this data in output):

Source snippet:
---
SOURCE FILE: quote-v3.pdf
TYPE: pdf
---
Project: Riverside HVAC Retrofit. Customer: Greenfield Industries.
Supply only, no install. Delivery: approximately late August 2026.
---

Example field outputs:
{"fieldKey":"projectName","extractedValue":"Riverside HVAC Retrofit","status":"filled","confidence":"high","evidenceText":"Project: Riverside HVAC Retrofit","sourceName":"quote-v3.pdf","reasoningNote":"Explicitly stated as project name."}
{"fieldKey":"estimatedDeliveryDate","extractedValue":"late August 2026","status":"needs_review","confidence":"medium","evidenceText":"approximately late August 2026","sourceName":"quote-v3.pdf","reasoningNote":"Approximate only — needs firm date confirmation."}
{"fieldKey":"paymentMethod","extractedValue":null,"status":"missing","confidence":"high","evidenceText":"","sourceName":"quote-v3.pdf","reasoningNote":"No payment terms found in any source document."}`;
}

export function buildExtractionPrompt(
  sourceName: string,
  sourceText: string,
  voiceNotes?: string,
  answers?: Record<string, string>,
) {
  const voiceSection = voiceNotes?.trim()
    ? `\nVoice notes (spoken by the salesperson after reviewing the documents — use these to fill missing fields or resolve conflicts in the source pack):\n---\n${voiceNotes.trim()}\n---\n`
    : "";

  const confirmedSection = answers && Object.keys(answers).length > 0
    ? (() => {
        const relevant = Object.entries(answers).filter(([, v]) => v !== "");
        if (!relevant.length) return "";
        const lines = relevant.map(([id, val]) => `${id}: ${val}`).join("\n");
        return `\nConfirmed project details (verified by sales team — use these to fill header fields; they take precedence over ambiguous source text):\n${lines}\n\nWhen you fill a field using a confirmed detail above, set evidenceText to the matching line (e.g. "project_type: Supply Loose") and sourceName to "Confirmed project details".\n`;
      })()
    : "";

  return `${STATIC_PROMPT_PREFIX}

Source pack name:
${sourceName}

Source pack text:
---
${sourceText.slice(0, MAX_SOURCE_CHARS)}
---
${voiceSection}${confirmedSection}`;
}
