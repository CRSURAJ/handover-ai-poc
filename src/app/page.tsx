"use client";

import { ChecklistTable } from "@/components/ChecklistTable";
import { HeaderFieldsTable } from "@/components/HeaderFieldsTable";
import { OpsSummaryPanel } from "@/components/OpsSummaryPanel";
import { ReviewSummary } from "@/components/ReviewSummary";
import { SourcePackPanel } from "@/components/SourcePackPanel";
import { useHandoverExtraction } from "@/hooks/useHandoverExtraction";

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
    setSourceName,
    updateSourceText,
    onFilesChange,
    extract,
    resetAll,
    exportHandoverChecklist,
  } = useHandoverExtraction();

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
          onSourceTextChange={updateSourceText}
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
