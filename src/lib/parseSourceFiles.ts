import { extractBufferText } from "@/lib/extractFileText";

export const MAX_SOURCE_FILES = 10;
export const MAX_SOURCE_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export type ParsedSourceFile = Awaited<ReturnType<typeof extractBufferText>>;

export class SourceParsingApiError extends Error {
  constructor(
    message: string,
    public status = 500,
    public detail?: string,
  ) {
    super(message);
    this.name = "SourceParsingApiError";
  }
}

export function getUploadedSourceFiles(formData: FormData) {
  return formData
    .getAll("files")
    .filter((item): item is File => item instanceof File);
}

export function validateSourceFiles(files: File[]) {
  if (!files.length) {
    throw new SourceParsingApiError(
      "No files uploaded.",
      400,
      "Upload at least one source document.",
    );
  }

  if (files.length > MAX_SOURCE_FILES) {
    throw new SourceParsingApiError(
      "Too many files uploaded.",
      400,
      `Upload ${MAX_SOURCE_FILES} files or fewer at one time.`,
    );
  }

  const oversizedFile = files.find(
    (file) => file.size > MAX_SOURCE_FILE_SIZE_BYTES,
  );

  if (oversizedFile) {
    throw new SourceParsingApiError(
      "Uploaded file is too large.",
      400,
      `${oversizedFile.name} is larger than 20 MB.`,
    );
  }
}

export async function parseUploadedSourceFiles(files: File[]) {
  const parsed: ParsedSourceFile[] = [];

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await extractBufferText(buffer, file.name, file.type);

    parsed.push(result);
  }

  return parsed;
}

export function buildCombinedSourceText(parsed: ParsedSourceFile[]) {
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
