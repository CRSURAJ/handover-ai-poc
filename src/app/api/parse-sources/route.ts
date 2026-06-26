import { NextRequest, NextResponse } from "next/server";

import {
  buildCombinedSourceText,
  getUploadedSourceFiles,
  parseUploadedSourceFiles,
  SourceParsingApiError,
  validateSourceFiles,
} from "@/lib/parseSourceFiles";

export const runtime = "nodejs";
export const maxDuration = 60;

function errorResponse(error: unknown) {
  if (error instanceof SourceParsingApiError) {
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
      error: "File upload parsing failed.",
      detail: error instanceof Error ? error.message : String(error),
    },
    { status: 500 },
  );
}

export async function POST(request: NextRequest) {
  try {
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
