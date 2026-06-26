import { NextRequest, NextResponse } from "next/server";

import {
  buildCombinedSourceText,
  getUploadedSourceFiles,
  parseUploadedSourceFiles,
  SourceParsingApiError,
  validateSourceFiles,
} from "@/lib/parseSourceFiles";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

// 20 parse requests per IP per hour.
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function errorResponse(error: unknown) {
  if (error instanceof SourceParsingApiError) {
    return NextResponse.json(
      { error: error.message, detail: error.detail },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { error: "File upload parsing failed." },
    { status: 500 },
  );
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (!checkRateLimit("parse", ip, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const files = getUploadedSourceFiles(formData);

    validateSourceFiles(files);

    const parsed = await parseUploadedSourceFiles(files);
    const combinedText = buildCombinedSourceText(parsed);

    return NextResponse.json({ parsed, combinedText });
  } catch (error) {
    console.error("File upload parsing failed:", error);
    return errorResponse(error);
  }
}
