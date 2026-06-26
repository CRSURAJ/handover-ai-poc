import { NextRequest, NextResponse } from "next/server";

import { extractBufferText } from "@/lib/extractFileText";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

class ApiError extends Error {
  constructor(
    message: string,
    public status = 500,
    public detail?: string,
  ) {
    super(message);
  }
}

function getUploadedFiles(formData: FormData) {
  return formData
    .getAll("files")
    .filter((item): item is File => item instanceof File);
}

function validateUploadedFiles(files: File[]) {
  if (!files.length) {
    throw new ApiError(
      "No files uploaded.",
      400,
      "Upload at least one source document.",
    );
  }

  if (files.length > MAX_FILES) {
    throw new ApiError(
      "Too many files uploaded.",
      400,
      `Upload ${MAX_FILES} files or fewer at one time.`,
    );
  }

  const oversizedFile = files.find((file) => file.size > MAX_FILE_SIZE_BYTES);

  if (oversizedFile) {
    throw new ApiError(
      "Uploaded file is too large.",
      400,
      `${oversizedFile.name} is larger than 20 MB.`,
    );
  }
}

async function parseUploadedFiles(files: File[]) {
  const parsed = [];

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await extractBufferText(buffer, file.name, file.type);

    parsed.push(result);
  }

  return parsed;
}

function buildCombinedText(
  parsed: Awaited<ReturnType<typeof parseUploadedFiles>>,
) {
  return parsed
    .map((source) => {
      const warning = source.warning ? `\nWarning: ${source.warning}` : "";

      return [
        `SOURCE FILE: ${source.fileName}`,
        `TYPE: ${source.fileType}${warning}`,
        "---",
        source.extractedText,
      ].join("\n");
    })
    .join("\n\n==============================\n\n")
    .trim();
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
      error: "File upload parsing failed.",
      detail: error instanceof Error ? error.message : String(error),
    },
    { status: 500 },
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = getUploadedFiles(formData);

    validateUploadedFiles(files);

    const parsed = await parseUploadedFiles(files);
    const combinedText = buildCombinedText(parsed);

    return NextResponse.json({ parsed, combinedText });
  } catch (error) {
    console.error("File upload parsing failed:", error);
    return errorResponse(error);
  }
}
