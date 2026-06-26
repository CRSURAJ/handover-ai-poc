export const SUPPORTED_SOURCE_FILE_EXTENSIONS = [
  "txt",
  "eml",
  "csv",
  "md",
  "pdf",
  "docx",
  "xlsx",
  "xls",
  "html",
  "htm",
] as const;

const SUPPORTED_SOURCE_FILE_EXTENSION_SET = new Set<string>(
  SUPPORTED_SOURCE_FILE_EXTENSIONS,
);

export const SOURCE_FILE_ACCEPT = SUPPORTED_SOURCE_FILE_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(",");

export const MAX_SOURCE_FILES = 10;
export const MAX_SOURCE_FILE_SIZE_MB = 20;
export const MAX_SOURCE_FILE_SIZE_BYTES =
  MAX_SOURCE_FILE_SIZE_MB * 1024 * 1024;

export function getSourceFileExtension(fileName: string) {
  const parts = fileName.toLowerCase().trim().split(".");

  return parts.length > 1 ? parts.pop() || "" : "";
}

export function isSupportedSourceFileName(fileName: string) {
  return SUPPORTED_SOURCE_FILE_EXTENSION_SET.has(
    getSourceFileExtension(fileName),
  );
}

export function formatSupportedSourceFileTypes() {
  return SUPPORTED_SOURCE_FILE_EXTENSIONS.map((extension) =>
    extension.toUpperCase(),
  ).join(", ");
}
