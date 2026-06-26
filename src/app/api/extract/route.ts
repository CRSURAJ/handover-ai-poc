import { NextRequest, NextResponse } from "next/server";

import {
  ExtractionApiError,
  runOpenAIExtraction,
} from "@/lib/runOpenAIExtraction";

export const runtime = "nodejs";

class RequestApiError extends Error {
  constructor(
    message: string,
    public status = 400,
    public detail?: string,
  ) {
    super(message);
    this.name = "RequestApiError";
  }
}

function normaliseSourceName(value: unknown) {
  const sourceName = String(value || "").trim();
  return sourceName || "source-pack";
}

function normaliseSourceText(value: unknown) {
  return String(value || "").trim();
}

function errorResponse(error: unknown) {
  if (error instanceof ExtractionApiError || error instanceof RequestApiError) {
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
      throw new RequestApiError(
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
