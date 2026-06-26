import {
  CHECKLIST_ITEMS,
  HEADER_FIELDS,
  TEMPLATE_NAME,
  TEMPLATE_REVISION,
} from "@/lib/template";

const MAX_SOURCE_CHARS = 120000;

export function buildExtractionPrompt(sourceName: string, sourceText: string) {
  return `
You are an engineering project handover checklist extraction assistant.

Your job:
Read the supplied source pack and auto-fill the "${TEMPLATE_NAME} — Rev ${TEMPLATE_REVISION}" checklist.

Important rules:
- Extract only information that is supported by the source text.
- Do not invent values.
- Every filled field must include short evidenceText from the source.
- If a value is not found, set extractedValue to null and status to "missing".
- If the source says TBC, pending, not yet, to be confirmed, approval required, or similar, mark the field as "needs_review".
- If different documents conflict, mark status as "conflict" and explain in reasoningNote.
- Prefer newer/firmer commercial documents such as quote, purchase order, scope of works, and signed documents.
- Keep the original scope intent. Do not convert supply-only into installation or on-site commissioning.
- Keep comments concise and useful for Ops handover.
- For checklist items, fill comments with the best extracted answer.
- Use remarks for warnings, exclusions, or required follow-up.
- Use handoverMeetingNotes for what Ops must discuss or confirm.

Header fields to return exactly:
${HEADER_FIELDS.map((field) => `- ${field.fieldKey}: ${field.fieldLabel}`).join("\n")}

Checklist items to return exactly:
${CHECKLIST_ITEMS.map((item) => `- [${item.category}] ${item.itemLabel}`).join("\n")}

Source pack name:
${sourceName}

Source pack text:
---
${sourceText.slice(0, MAX_SOURCE_CHARS)}
---
`;
}
