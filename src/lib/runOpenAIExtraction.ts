import OpenAI from "openai";

import { buildExtractionPrompt, MAX_SOURCE_CHARS } from "@/lib/buildExtractionPrompt";
import { extractionJsonSchema } from "@/lib/schema";
import type { HandoverExtractionResult } from "@/lib/types";
import { parseHandoverExtractionResult } from "@/lib/validateHandoverResult";

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
      "AI extraction service is not configured.",
      500,
    );
  }

  // maxRetries: 2 retries on transient failures (rate limits, timeouts).
  return new OpenAI({ apiKey, maxRetries: 2 });
}

function parseExtractionOutput(outputText: string): HandoverExtractionResult {
  try {
    const parsed = {
      ...JSON.parse(outputText),
      extractionMode: "ai",
    };

    return parseHandoverExtractionResult(parsed);
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
  voiceNotes?: string,
  answers?: Record<string, string>,
): Promise<HandoverExtractionResult> {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const wasTruncated = sourceText.length > MAX_SOURCE_CHARS;

  const response = await client.responses.create({
    model,
    input: buildExtractionPrompt(sourceName, sourceText, voiceNotes, answers),
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

  const result = parseExtractionOutput(response.output_text);
  return { ...result, wasTruncated };
}
