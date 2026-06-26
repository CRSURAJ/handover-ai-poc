"use client";

import { useMemo, useState } from "react";

import {
  buildHandoverHtml,
  getHandoverProjectName,
} from "@/lib/exportHandoverHtml";
import { downloadTextFile, makeFileName } from "@/lib/handoverUi";
import type { HandoverExtractionResult } from "@/lib/types";

const initialSourceText = "";

async function getResponseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function getApiErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") {
    return fallback;
  }

  const payload = data as { error?: unknown; detail?: unknown };

  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  if (typeof payload.detail === "string" && payload.detail.trim()) {
    return payload.detail;
  }

  return fallback;
}

export function useHandoverExtraction() {
  const [sourceName, setSourceName] = useState("");
  const [sourceText, setSourceText] = useState(initialSourceText);
  const [result, setResult] = useState<HandoverExtractionResult | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(() => {
    if (!result) return null;

    const total = result.checklistItems.length;
    const complete = result.checklistItems.filter(
      (item) => item.suggestedStatus === "complete",
    ).length;

    return {
      total,
      complete,
      percent: total > 0 ? Math.round((complete / total) * 100) : 0,
    };
  }, [result]);

  function updateSourceText(value: string) {
    setSourceText(value);
    setResult(null);
  }

  async function extract() {
    setIsExtracting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sourceName, sourceText }),
      });

      const data = await getResponseJson(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Extraction failed"));
      }

      setResult(data as HandoverExtractionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setIsExtracting(false);
    }
  }

  async function onFilesChange(files: FileList | null) {
    if (!files?.length) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();

      Array.from(files).forEach((file) => formData.append("files", file));

      const response = await fetch("/api/parse-sources", {
        method: "POST",
        body: formData,
      });

      const data = await getResponseJson(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "File parsing failed"));
      }

      const names = Array.from(files).map((file) => file.name);
      const combinedText =
        data && typeof data === "object" && "combinedText" in data
          ? String((data as { combinedText?: unknown }).combinedText || "")
          : "";

      setUploadedFiles(names);
      setSourceName(names.join(", "));
      setSourceText(combinedText);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "File parsing failed");
    } finally {
      setIsUploading(false);
    }
  }

  function resetAll() {
    setSourceName("");
    setSourceText("");
    setResult(null);
    setIsExtracting(false);
    setIsUploading(false);
    setUploadedFiles([]);
    setError(null);

    document.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach(
      (input) => {
        input.value = "";
      },
    );
  }

  function exportHandoverChecklist() {
    if (!result) return;

    const projectName = getHandoverProjectName(result, sourceName);
    const html = buildHandoverHtml({ result, sourceName, progress });

    downloadTextFile(
      makeFileName(projectName),
      html,
      "text/html;charset=utf-8",
    );
  }

  return {
    sourceName,
    sourceText,
    result,
    isExtracting,
    isUploading,
    uploadedFiles,
    error,
    progress,
    setSourceName,
    updateSourceText,
    onFilesChange,
    extract,
    resetAll,
    exportHandoverChecklist,
  };
}
