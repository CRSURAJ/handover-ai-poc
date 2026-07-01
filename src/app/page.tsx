"use client";

import { useEffect, useRef, useState } from "react";

import { ChecklistTable } from "@/components/ChecklistTable";
import { HeaderFieldsTable } from "@/components/HeaderFieldsTable";
import { LoadingOverlay } from "@/components/LoadingOverlay";
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
    resetAll,
    exportHandoverPdf,
    exportSpreadsheet,
    updateHeaderField,
    updateChecklistItem,
    startSow,
    confirmFull,
    sowResult,
    updateSowResult,
    sowQuestions,
    isSowGenerating,
    isSowQuestioning,
    sowError,
    sowQuestionsError,
  } = useHandoverExtraction();

  const resultsRef = useRef<HTMLDivElement>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");

  const isGenerating = isExtracting || isSowGenerating || isSowQuestioning;

  useEffect(() => {
    if ((result || sowResult) && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result, sowResult]);

  return (
    <>
      <LoadingOverlay visible={isGenerating} onCancel={resetAll} />
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
              onClick={() => startSow(voiceTranscript)}
              disabled={isUploading || isGenerating || (!sourceText.trim() && !voiceTranscript.trim())}
            >
              {isUploading
                ? "Parsing files…"
                : isGenerating
                  ? "Generating…"
                  : "✦ Generate SOW + Checklist"}
            </button>

            <button
              className="button sourceActionButton exportButton"
              onClick={exportHandoverPdf}
              disabled={!result}
            >
              ↓ Export PDF
            </button>

            <button
              className="button sourceActionButton exportButton"
              onClick={exportSpreadsheet}
              disabled={!result}
            >
              ↓ Export Spreadsheet
            </button>

            <button className="button sourceActionButton resetButton" onClick={() => { resetAll(); window.location.reload(); }}>
              ↺ Reset
            </button>
          </div>

          <div ref={resultsRef}>
            <ScopeOfWorksPanel
              result={sowResult}
              isGenerating={isSowGenerating}
              isQuestioning={isSowQuestioning}
              error={sowError}
              questions={sowQuestions}
              questionsError={sowQuestionsError}
              onGenerate={() => startSow(voiceTranscript)}
              onConfirmQuestions={confirmFull}
              canGenerate={!isUploading && !isGenerating && (!!sourceText.trim() || !!voiceTranscript.trim())}
              onUpdate={updateSowResult}
            />

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

            {!isExtracting && !result && error && (
              <section className="panel wide">
                <div className="panelHeader"><div><h2>Advisory Handover Checklist</h2></div></div>
                <p className="error" style={{ margin: "16px 0 0" }}>
                  ⚠ Checklist extraction failed — {error}. Try generating again.
                </p>
              </section>
            )}

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
        </div>{/* outerCard */}
      </main>
    </>
  );
}
