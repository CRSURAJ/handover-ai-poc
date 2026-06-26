"use client";

import { useMemo, useState } from "react";

import { ChecklistTable } from "@/components/ChecklistTable";
import { HeaderFieldsTable } from "@/components/HeaderFieldsTable";
import { OpsSummaryPanel } from "@/components/OpsSummaryPanel";
import { ReviewSummary } from "@/components/ReviewSummary";
import { SourcePackPanel } from "@/components/SourcePackPanel";
import { buildHandoverHtml, getHandoverProjectName } from "@/lib/exportHandoverHtml";
import { downloadTextFile, makeFileName } from "@/lib/handoverUi";
import type { HandoverExtractionResult } from "@/lib/types";

const initialSourceText = "";

export default function Home() {
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || "Extraction failed");
      }

      setResult(data);
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || "File parsing failed");
      }

      const names = Array.from(files).map((file) => file.name);

      setUploadedFiles(names);
      setSourceName(names.join(", "));
      setSourceText(data.combinedText || "");
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

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">HandoverAI POC</p>
        <h1>AI Handover Checklist Autofill</h1>
        <p>
          Upload or paste Sales handover material, then let AI pre-fill the Ops
          checklist with evidence, confidence, and review flags.
        </p>
      </section>

      <div className="layout">
        <SourcePackPanel
          sourceName={sourceName}
          sourceText={sourceText}
          uploadedFiles={uploadedFiles}
          isUploading={isUploading}
          isExtracting={isExtracting}
          error={error}
          hasResult={Boolean(result)}
          onSourceNameChange={setSourceName}
          onSourceTextChange={(value) => {
            setSourceText(value);
            setResult(null);
          }}
          onFilesChange={onFilesChange}
          onExtract={extract}
          onExport={exportHandoverChecklist}
          onReset={resetAll}
        />

        <ReviewSummary result={result} progress={progress} />
      </div>

      {result && (
        <>
          <HeaderFieldsTable result={result} />
          <ChecklistTable result={result} />
          <OpsSummaryPanel result={result} />
        </>
      )}
    </main>
  );
}
