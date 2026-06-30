"use client";

import { useEffect, useRef, useState } from "react";

import { ChecklistTable } from "@/components/ChecklistTable";
import { HeaderFieldsTable } from "@/components/HeaderFieldsTable";
import { ScopeOfWorksPanel } from "@/components/ScopeOfWorksPanel";
import { ReviewSummary } from "@/components/ReviewSummary";
import { SourcePackPanel } from "@/components/SourcePackPanel";
import { VoicePackPanel } from "@/components/VoicePackPanel";
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
    sourceText,
    result,
    isExtracting,
    isUploading,
    uploadedFiles,
    error,
    progress,
    fileInputKey,
    onFilesChange,
    extract,
    resetAll,
    exportHandoverChecklist,
    updateHeaderField,
    updateChecklistItem,
    generateSow,
    sowResult,
    isSowGenerating,
    sowError,
  } = useHandoverExtraction();

  const resultsRef = useRef<HTMLDivElement>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  return (
    <>
      <main className="shell">
        <div className="outerCard">
          <div className="appHeader">
            <div className="appLogo">
              <span className="appLogoAH">Advisory Handover Checklist</span>
            </div>
          </div>

          <div className="packsRow">
            <SourcePackPanel
              uploadedFiles={uploadedFiles}
              isUploading={isUploading}
              error={error}
              fileInputKey={fileInputKey}
              onFilesChange={onFilesChange}
            />
            <VoicePackPanel onTranscriptChange={setVoiceTranscript} />
          </div>

          <div className="actionBar">
            <button
              className="button sourceActionButton"
              onClick={() => extract(voiceTranscript)}
              disabled={isUploading || isExtracting || (!sourceText.trim() && !voiceTranscript.trim())}
            >
              {isUploading
                ? "Parsing files…"
                : isExtracting
                  ? "Extracting…"
                  : "✦ Auto-fill Checklist"}
            </button>

            <button
              className="button sourceActionButton exportButton"
              onClick={exportHandoverChecklist}
              disabled={!result}
            >
              ↓ Export
            </button>

            <button className="button sourceActionButton resetButton" onClick={resetAll}>
              ↺ Reset
            </button>
          </div>

          <ReviewSummary result={result} progress={progress} />

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
              <section className="panel wide">
                <div className="panelHeader">
                  <div><h2>Advisory Handover Checklist</h2></div>
                </div>
                <HeaderFieldsTable result={result} onUpdateField={updateHeaderField} />
                <ChecklistTable result={result} onUpdateItem={updateChecklistItem} />
              </section>
            )}
          </div>

          <ScopeOfWorksPanel
            result={sowResult}
            isGenerating={isSowGenerating}
            error={sowError}
            onGenerate={() => generateSow(voiceTranscript)}
            canGenerate={!isUploading && !isSowGenerating && (!!sourceText.trim() || !!voiceTranscript.trim())}
          />
        </div>{/* outerCard */}
      </main>
    </>
  );
}
