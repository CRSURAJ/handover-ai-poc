import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { buildExtractionPrompt } from "@/lib/buildExtractionPrompt";
import { extractionJsonSchema } from "@/lib/schema";
import type { HandoverExtractionResult } from "@/lib/types";

export const runtime = "nodejs";

class ApiError extends Error {
  constructor(
    message: string,
    public status = 500,
    public detail?: string,
  ) {
    super(message);
  }
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
    input: buildExtractionPrompt(sourceName, sourceText),
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
