import type { HandoverExtractionResult } from "@/lib/types";
import { parseHandoverExtractionResult } from "@/lib/validateHandoverResult";

type ApiErrorPayload = {
  error?: unknown;
  detail?: unknown;
};

export type ParseSourcesResponse = {
  parsed: unknown[];
  combinedText: string;
};

export class HandoverApiError extends Error {
  constructor(
    message: string,
    public detail?: string,
  ) {
    super(message);
    this.name = "HandoverApiError";
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const { error, detail } = payload as ApiErrorPayload;

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return fallback;
}

function getApiErrorDetail(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const { detail } = payload as ApiErrorPayload;

  return typeof detail === "string" && detail.trim() ? detail : undefined;
}

export async function extractHandoverChecklist(params: {
  sourceName: string;
  sourceText: string;
  signal?: AbortSignal;
}): Promise<HandoverExtractionResult> {
  const { signal, ...bodyParams } = params;
  const response = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyParams),
    signal,
  });

  const data = await readJson(response);

  if (!response.ok) {
    throw new HandoverApiError(
      getApiErrorMessage(data, "Extraction failed"),
      getApiErrorDetail(data),
    );
  }

  try {
    return parseHandoverExtractionResult(data);
  } catch (error) {
    throw new HandoverApiError(
      "Extraction response was invalid.",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function parseSourceFiles(files: File[]) {
  const formData = new FormData();

  files.forEach((file) => formData.append("files", file));

  const response = await fetch("/api/parse-sources", {
    method: "POST",
    body: formData,
  });

  const data = await readJson(response);

  if (!response.ok) {
    throw new HandoverApiError(
      getApiErrorMessage(data, "File parsing failed"),
      getApiErrorDetail(data),
    );
  }

  const parsedResponse = data as Partial<ParseSourcesResponse>;

  return {
    parsed: Array.isArray(parsedResponse.parsed) ? parsedResponse.parsed : [],
    combinedText:
      typeof parsedResponse.combinedText === "string"
        ? parsedResponse.combinedText
        : "",
  };
}
