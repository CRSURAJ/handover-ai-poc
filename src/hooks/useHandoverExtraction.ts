"use client";

import { useMemo, useRef, useState } from "react";

import {
  extractHandoverChecklist,
  fetchSowQuestions,
  generateScopeOfWorks,
  parseSourceFiles,
} from "@/lib/handoverApiClient";
import type { ScopeOfWorksResult } from "@/lib/sowTypes";
import type { SowQuestion } from "@/lib/sowQuestionTypes";
import {
  buildHandoverHtml,
  getHandoverProjectName,
} from "@/lib/exportHandoverHtml";
import { downloadTextFile, makeFileName } from "@/lib/handoverUi";
import { getHandoverProgress } from "@/lib/handoverProgress";
import type { HandoverExtractionResult } from "@/lib/types";

// Abort extraction after 90 seconds to prevent the UI hanging indefinitely.
const EXTRACTION_TIMEOUT_MS = 300_000;

export function useHandoverExtraction() {
  const [sourceName, setSourceName] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [result, setResult] = useState<HandoverExtractionResult | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSowGenerating, setIsSowGenerating] = useState(false);
  const [isSowQuestioning, setIsSowQuestioning] = useState(false);
  const [sowResult, setSowResult] = useState<ScopeOfWorksResult | null>(null);
  const [sowQuestions, setSowQuestions] = useState<SowQuestion[] | null>(null);
  const [sowVoiceNotes, setSowVoiceNotes] = useState("");
  const [sowError, setSowError] = useState<string | null>(null);
  const [sowQuestionsError, setSowQuestionsError] = useState<string | null>(null);
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

  async function extract(voiceNotes?: string) {
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
        voiceNotes,
        signal: controller.signal,
      });

      setResult(extractionResult);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError(
          "Extraction timed out after 5 minutes. Try reducing the amount of source material.",
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

    setSowResult(null);
    setSowQuestions(null);
    setSowVoiceNotes("");
    setSowError(null);
    setSowQuestionsError(null);
    setIsSowGenerating(false);
    setIsSowQuestioning(false);
  }

  async function startSow(voiceNotes?: string) {
    setSowVoiceNotes(voiceNotes ?? "");
    setSowError(null);
    setSowQuestionsError(null);
    setSowQuestions(null);
    setSowResult(null);
    setIsSowQuestioning(true);

    let questions: SowQuestion[] = [];
    let fetchFailed = false;

    try {
      const result = await fetchSowQuestions({ sourceName, sourceText, voiceNotes });
      questions = result.questions;
    } catch (err) {
      fetchFailed = true;
      setSowQuestionsError(err instanceof Error ? err.message : "Could not load questions");
    } finally {
      setIsSowQuestioning(false);
    }

    if (!fetchFailed && questions.length === 0) {
      await _doGenerateSow(voiceNotes, {});
    } else {
      setSowQuestions(questions);
    }
  }

  async function confirmFull(answers: Record<string, string>) {
    setSowQuestions(null);
    setSowError(null);
    setError(null);
    setIsSowGenerating(true);
    setIsExtracting(true);

    const [sowOutcome, checklistOutcome] = await Promise.allSettled([
      generateScopeOfWorks({ sourceName, sourceText, voiceNotes: sowVoiceNotes, answers }),
      extractHandoverChecklist({ sourceName, sourceText, voiceNotes: sowVoiceNotes, answers }),
    ]);

    if (sowOutcome.status === "fulfilled") {
      setSowResult(sowOutcome.value);
    } else {
      setSowError(sowOutcome.reason instanceof Error ? sowOutcome.reason.message : "SOW generation failed");
    }
    setIsSowGenerating(false);

    if (checklistOutcome.status === "fulfilled") {
      setResult(checklistOutcome.value);
    } else {
      setError(checklistOutcome.reason instanceof Error ? checklistOutcome.reason.message : "Checklist extraction failed");
    }
    setIsExtracting(false);
  }

  async function _doGenerateSow(voiceNotes: string | undefined, answers: Record<string, string>) {
    setSowQuestions(null);
    setSowError(null);
    setIsSowGenerating(true);
    try {
      const result = await generateScopeOfWorks({ sourceName, sourceText, voiceNotes, answers });
      setSowResult(result);
    } catch (err) {
      setSowError(err instanceof Error ? err.message : "Scope of Works generation failed");
    } finally {
      setIsSowGenerating(false);
    }
  }

  function updateHeaderField(
    fieldKey: string,
    patch: { extractedValue?: string | null; status?: import("@/lib/types").FieldStatus },
  ) {
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        headerFields: prev.headerFields.map((f) =>
          f.fieldKey === fieldKey ? { ...f, ...patch } : f,
        ),
      };
    });
  }

  function updateChecklistItem(
    itemLabel: string,
    patch: {
      suggestedStatus?: import("@/lib/types").ChecklistStatus;
      comments?: string;
      remarks?: string;
    },
  ) {
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklistItems: prev.checklistItems.map((item) =>
          item.itemLabel === itemLabel ? { ...item, ...patch } : item,
        ),
      };
    });
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
    updateHeaderField,
    updateChecklistItem,
    startSow,
    confirmFull,
    sowResult,
    updateSowResult: setSowResult,
    sowQuestions,
    isSowGenerating,
    isSowQuestioning,
    sowError,
    sowQuestionsError,
  };
}
