import { NextRequest, NextResponse } from "next/server";

import {
  ExtractionApiError,
  runOpenAIExtraction,
} from "@/lib/runOpenAIExtraction";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

// 10 extractions per IP per hour.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// Hard cap before truncation. Beyond this the request is unreasonably large.
const MAX_SOURCE_TEXT_CHARS = 500_000;

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
  return String(value || "").trim().slice(0, 500) || "source-pack";
}

function normaliseSourceText(value: unknown) {
  return String(value || "").trim();
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function errorResponse(error: unknown) {
  if (error instanceof ExtractionApiError || error instanceof RequestApiError) {
    return NextResponse.json(
      { error: error.message, detail: error.detail },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { error: "AI extraction failed." },
    { status: 500 },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const sourceName = normaliseSourceName(body.sourceName);
    const sourceText = normaliseSourceText(body.sourceText);
    const voiceNotes = String(body.voiceNotes || "").trim();

    // Validate payload before charging the rate limit — invalid requests
    // (empty or oversized body) must not count against a client's quota.
    if (!sourceText && !voiceNotes) {
      throw new RequestApiError(
        "Source text is required.",
        400,
        "Upload a source document or provide a voice transcript.",
      );
    }

    if (sourceText.length > MAX_SOURCE_TEXT_CHARS) {
      throw new RequestApiError(
        "Source text is too long.",
        413,
        `Maximum ${MAX_SOURCE_TEXT_CHARS.toLocaleString()} characters allowed. Received ${sourceText.length.toLocaleString()}.`,
      );
    }

    const ip = getClientIp(request);
    if (!checkRateLimit("extract", ip, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 },
      );
    }

    const result = await runOpenAIExtraction(sourceName, sourceText, voiceNotes);

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI extraction failed:", error);
    return errorResponse(error);
  }
}
