import OpenAI from "openai";

import { buildSowQuestionsPrompt } from "@/lib/buildSowQuestionsPrompt";
import { sowQuestionsJsonSchema } from "@/lib/sowQuestionsSchema";
import type { SowQuestionsResult } from "@/lib/sowQuestionTypes";

export class SowQuestionsApiError extends Error {
  constructor(
    message: string,
    public status = 500,
    public detail?: string,
  ) {
    super(message);
    this.name = "SowQuestionsApiError";
  }
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new SowQuestionsApiError("AI service is not configured.", 500);
  return new OpenAI({ apiKey, maxRetries: 2 });
}

export async function runSowQuestionsExtraction(
  sourceName: string,
  sourceText: string,
  voiceNotes?: string,
): Promise<SowQuestionsResult> {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await client.responses.create({
    model,
    input: buildSowQuestionsPrompt(sourceName, sourceText, voiceNotes),
    text: {
      format: {
        type: "json_schema",
        name: "sow_questions",
        schema: sowQuestionsJsonSchema,
        strict: true,
      },
    },
  });

  if (!response.output_text) {
    throw new SowQuestionsApiError("AI did not return any output.", 502);
  }

  try {
    return JSON.parse(response.output_text) as SowQuestionsResult;
  } catch (err) {
    throw new SowQuestionsApiError(
      "AI returned an invalid format.",
      502,
      err instanceof Error ? err.message : String(err),
    );
  }
}
