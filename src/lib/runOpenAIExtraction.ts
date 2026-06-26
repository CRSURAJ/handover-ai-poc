import OpenAI from "openai";

import { buildExtractionPrompt } from "@/lib/buildExtractionPrompt";
import { extractionJsonSchema } from "@/lib/schema";
import type { HandoverExtractionResult } from "@/lib/types";

export class ExtractionApiError extends Error {
  constructor(
    message: string,
    public status = 500,
    public detail?: string,
  ) {
    super(message);
    this.name = "ExtractionApiError";
  }
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new ExtractionApiError(
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
    throw new ExtractionApiError(
      "AI returned an invalid extraction format.",
      502,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function runOpenAIExtraction(
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
    throw new ExtractionApiError(
      "AI did not return any extraction output.",
      502,
      "OpenAI response did not contain output_text.",
    );
  }

  return parseExtractionOutput(response.output_text);
}
