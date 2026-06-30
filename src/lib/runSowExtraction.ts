import OpenAI from "openai";

import { buildSowPrompt } from "@/lib/buildSowPrompt";
import { sowJsonSchema } from "@/lib/sowSchema";
import type { ScopeOfWorksResult } from "@/lib/sowTypes";

export class SowApiError extends Error {
  constructor(
    message: string,
    public status = 500,
    public detail?: string,
  ) {
    super(message);
    this.name = "SowApiError";
  }
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new SowApiError("AI service is not configured.", 500);
  return new OpenAI({ apiKey, maxRetries: 2 });
}

export async function runSowExtraction(
  sourceName: string,
  sourceText: string,
  voiceNotes?: string,
): Promise<ScopeOfWorksResult> {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await client.responses.create({
    model,
    input: buildSowPrompt(sourceName, sourceText, voiceNotes),
    text: {
      format: {
        type: "json_schema",
        name: "scope_of_works",
        schema: sowJsonSchema,
        strict: true,
      },
    },
  });

  if (!response.output_text) {
    throw new SowApiError("AI did not return any output.", 502);
  }

  try {
    return JSON.parse(response.output_text) as ScopeOfWorksResult;
  } catch (err) {
    throw new SowApiError(
      "AI returned an invalid format.",
      502,
      err instanceof Error ? err.message : String(err),
    );
  }
}
