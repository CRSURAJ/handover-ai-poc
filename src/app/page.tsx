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
    <>
      <header className="topbar">
        <div className="topbarMark">HA</div>
        <span className="topbarName">HandoverAI</span>
        <span className="topbarPoc">POC</span>
      </header>

      <main className="shell">
        <div className="pageIntro">
          <h1>Handover Checklist Autofill</h1>
          <p>Upload Sales documents — AI pre-fills the Ops checklist with evidence, confidence scores, and review flags.</p>
        </div>

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
            onFilesChange={onFilesChange}
            onExtract={extract}
            onExport={exportHandoverChecklist}
            onReset={resetAll}
          />

          <ReviewSummary result={result} progress={progress} />
        </div>

        {result?.wasTruncated && (
          <p className="truncationWarning">
            ⚠ Source too large — only the first 120,000 characters were
            analysed. Some fields may show as missing because they were in the
            dropped content. Try splitting your documents into smaller uploads.
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
              <p className="sectionLabel">Extracted Results</p>
              <HeaderFieldsTable result={result} />
              <ChecklistTable result={result} />
              <OpsSummaryPanel result={result} />
            </>
          )}
        </div>
      </main>
    </>
  );
}
