"use client";

import { useMemo, useRef, useState } from "react";

import {
  extractHandoverChecklist,
  parseSourceFiles,
} from "@/lib/handoverApiClient";
import {
  buildHandoverHtml,
  getHandoverProjectName,
} from "@/lib/exportHandoverHtml";
import { downloadTextFile, makeFileName } from "@/lib/handoverUi";
import { getHandoverProgress } from "@/lib/handoverProgress";
import type { HandoverExtractionResult } from "@/lib/types";

// Abort extraction after 90 seconds to prevent the UI hanging indefinitely.
const EXTRACTION_TIMEOUT_MS = 90_000;

export function useHandoverExtraction() {
  const [sourceName, setSourceName] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [result, setResult] = useState<HandoverExtractionResult | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const progress = useMemo(() => getHandoverProgress(result), [result]);

  function updateSourceText(value: string) {
    setSourceText(value);
    setResult(null);
  }

  async function extract() {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = setTimeout(
      () => controller.abort(),
      EXTRACTION_TIMEOUT_MS,
    );

    setIsExtracting(true);
    setError(null);
    setResult(null);

    try {
      const extractionResult = await extractHandoverChecklist({
        sourceName,
        sourceText,
        signal: controller.signal,
      });

      setResult(extractionResult);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError(
          "Extraction timed out after 90 seconds. Try reducing the amount of source material.",
        );
      } else {
        setError(err instanceof Error ? err.message : "Extraction failed");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsExtracting(false);
      abortControllerRef.current = null;
    }
  }

  async function onFilesChange(files: FileList | null) {
    if (!files?.length) return;

    setIsUploading(true);
    setError(null);

    try {
      const fileList = Array.from(files);
      const parsed = await parseSourceFiles(fileList);
      const names = fileList.map((file) => file.name);

      setUploadedFiles(names);
      setSourceName(names.join(", "));
      setSourceText(parsed.combinedText);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "File parsing failed");
    } finally {
      setIsUploading(false);
    }
  }

  function resetAll() {
    if (
      !window.confirm(
        "Clear all source material and results? This cannot be undone.",
      )
    ) {
      return;
    }

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    setSourceName("");
    setSourceText("");
    setResult(null);
    setIsExtracting(false);
    setIsUploading(false);
    setUploadedFiles([]);
    setError(null);
    setFileInputKey((current) => current + 1);
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
    fileInputKey,
    setSourceName,
    updateSourceText,
    onFilesChange,
    extract,
    resetAll,
    exportHandoverChecklist,
  };
}
