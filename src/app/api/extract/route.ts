import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { extractionJsonSchema } from "@/lib/schema";
import type { HandoverExtractionResult } from "@/lib/types";
import {
  CHECKLIST_ITEMS,
  HEADER_FIELDS,
  TEMPLATE_NAME,
  TEMPLATE_REVISION,
} from "@/lib/template";

export const runtime = "nodejs";

function buildPrompt(sourceName: string, sourceText: string) {
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
${HEADER_FIELDS.map((f) => `- ${f.fieldKey}: ${f.fieldLabel}`).join("\n")}

Checklist items to return exactly:
${CHECKLIST_ITEMS.map((i) => `- [${i.category}] ${i.itemLabel}`).join("\n")}

Source pack name:
${sourceName}

Source pack text:
---
${sourceText.slice(0, 120000)}
---
`;
}

async function runOpenAIExtraction(
  sourceName: string,
  sourceText: string,
): Promise<HandoverExtractionResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required. This app is AI-only.");
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await client.responses.create({
    model,
    input: buildPrompt(sourceName, sourceText),
    text: {
      format: {
        type: "json_schema",
        name: "handover_checklist_extraction",
        schema: extractionJsonSchema,
        strict: true,
      },
    },
  });

  const outputText = response.output_text;

  if (!outputText) {
    throw new Error("OpenAI response did not contain output_text.");
  }

  return {
    ...JSON.parse(outputText),
    extractionMode: "ai",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const sourceName = String(body.sourceName || "source-pack");
    const sourceText = String(body.sourceText || "").trim();

    if (!sourceText) {
      return NextResponse.json(
        { error: "sourceText is required" },
        { status: 400 },
      );
    }

    const aiResult = await runOpenAIExtraction(sourceName, sourceText);

    return NextResponse.json(aiResult);
  } catch (error) {
    console.error("AI extraction failed:", error);

    return NextResponse.json(
      {
        error: "AI extraction failed",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
