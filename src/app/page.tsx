"use client";

import { useEffect, useRef } from "react";

import { ChecklistTable } from "@/components/ChecklistTable";
import { HeaderFieldsTable } from "@/components/HeaderFieldsTable";
import { OpsSummaryPanel } from "@/components/OpsSummaryPanel";
import { ReviewSummary } from "@/components/ReviewSummary";
import { SourcePackPanel } from "@/components/SourcePackPanel";
import { useHandoverExtraction } from "@/hooks/useHandoverExtraction";

function SkeletonTable({ rows }: { rows: number }) {
  return (
    <section className="panel wide skeletonPanel">
      <div className="skeletonTitle" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeletonRow" />
      ))}
    </section>
  );
}

export default function Home() {
  const {
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
  } = useHandoverExtraction();

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  return (
    <main className="shell">
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
          fileInputKey={fileInputKey}
          onSourceNameChange={setSourceName}
          onSourceTextChange={updateSourceText}
          onFilesChange={onFilesChange}
          onExtract={extract}
          onExport={exportHandoverChecklist}
          onReset={resetAll}
        />

        <ReviewSummary result={result} progress={progress} />
      </div>

      {result?.wasTruncated && (
        <p className="truncationWarning">
          ⚠ Source too large — only the first 120,000 characters were analysed.
          Some fields may show as missing because they were in the dropped content.
          Try splitting your documents into smaller uploads.
        </p>
      )}

      {isExtracting && !result && (
        <>
          <SkeletonTable rows={6} />
          <SkeletonTable rows={12} />
        </>
      )}

      <div ref={resultsRef}>
        {result && (
          <>
            <HeaderFieldsTable result={result} />
            <ChecklistTable result={result} />
            <OpsSummaryPanel result={result} />
          </>
        )}
      </div>
    </main>
  );
}
