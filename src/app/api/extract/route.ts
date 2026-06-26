import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { extractionJsonSchema } from "@/lib/schema";
import {
  CHECKLIST_ITEMS,
  HEADER_FIELDS,
  TEMPLATE_NAME,
  TEMPLATE_REVISION,
} from "@/lib/template";
import type { HandoverExtractionResult } from "@/lib/types";

export const runtime = "nodejs";

const MAX_SOURCE_CHARS = 120000;

class ApiError extends Error {
  constructor(
    message: string,
    public status = 500,
    public detail?: string,
  ) {
    super(message);
  }
}

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

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new ApiError(
      "OpenAI API key is not configured.",
      500,
      "Add OPENAI_API_KEY to .env.local. This app is AI-only.",
    );
  }

  return new OpenAI({ apiKey });
}

function parseExtractionOutput(outputText: string): HandoverExtractionResult {
  try {
    return {
      ...JSON.parse(outputText),
      extractionMode: "ai",
    };
  } catch (error) {
    throw new ApiError(
      "AI returned an invalid extraction format.",
      502,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function runOpenAIExtraction(
  sourceName: string,
  sourceText: string,
): Promise<HandoverExtractionResult> {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

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

  if (!response.output_text) {
    throw new ApiError(
      "AI did not return any extraction output.",
      502,
      "OpenAI response did not contain output_text.",
    );
  }

  return parseExtractionOutput(response.output_text);
}

function normaliseSourceName(value: unknown) {
  const sourceName = String(value || "").trim();
  return sourceName || "source-pack";
}

function normaliseSourceText(value: unknown) {
  return String(value || "").trim();
}

function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        detail: error.detail,
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      error: "AI extraction failed.",
      detail: error instanceof Error ? error.message : String(error),
    },
    { status: 500 },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const sourceName = normaliseSourceName(body.sourceName);
    const sourceText = normaliseSourceText(body.sourceText);

    if (!sourceText) {
      throw new ApiError(
        "Source text is required.",
        400,
        "Paste source text or upload at least one readable source document.",
      );
    }

    const result = await runOpenAIExtraction(sourceName, sourceText);

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI extraction failed:", error);
    return errorResponse(error);
  }
}
