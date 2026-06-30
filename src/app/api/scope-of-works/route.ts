import { NextRequest, NextResponse } from "next/server";

import { SowApiError, runSowExtraction } from "@/lib/runSowExtraction";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const MAX_SOURCE_TEXT_CHARS = 500_000;

class RequestApiError extends Error {
  constructor(message: string, public status = 400, public detail?: string) {
    super(message);
    this.name = "RequestApiError";
  }
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function errorResponse(error: unknown) {
  if (error instanceof SowApiError || error instanceof RequestApiError) {
    return NextResponse.json(
      { error: error.message, detail: error.detail },
      { status: error.status },
    );
  }
  return NextResponse.json({ error: "Scope of Works generation failed." }, { status: 500 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const sourceName = String(body.sourceName || "").trim().slice(0, 500) || "source-pack";
    const sourceText = String(body.sourceText || "").trim();
    const voiceNotes = String(body.voiceNotes || "").trim();

    if (!sourceText && !voiceNotes) {
      throw new RequestApiError(
        "Source text is required.",
        400,
        "Upload a source document or provide a voice transcript.",
      );
    }

    if (sourceText.length > MAX_SOURCE_TEXT_CHARS) {
      throw new RequestApiError("Source text is too long.", 413);
    }

    const ip = getClientIp(request);
    if (!checkRateLimit("sow", ip, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    const result = await runSowExtraction(sourceName, sourceText, voiceNotes);
    return NextResponse.json(result);
  } catch (error) {
    console.error("SOW generation failed:", error);
    return errorResponse(error);
  }
}
