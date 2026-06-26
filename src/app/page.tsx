"use client";

import { useMemo, useState } from "react";
import type { HandoverExtractionResult } from "@/lib/types";
import { buildHandoverHtml, getHandoverProjectName } from "@/lib/exportHandoverHtml";
import {
  badgeClass,
  downloadTextFile,
  escapeHtml,
  makeFileName,
  statusLabels,
} from "@/lib/handoverUi";


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
        headers: { "Content-Type": "application/json" },
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
        throw new Error(data.error || "File parsing failed");
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

    document
      .querySelectorAll<HTMLInputElement>('input[type="file"]')
      .forEach((input) => {
        input.value = "";
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

  return (
    <main className="shell">
      <section className="hero">
        <div>
          
          <h1>AI Handover Checklist Autofill</h1>
          
        </div>

        
      </section>

      <section className="grid two">
        <div className="panel">
          <div className="panelHeader">
            <div>
              <h2>1. Source Pack</h2>
        
            </div>
          </div>

          <label className="label">Source name</label>
          <input
            className="input"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
          />

          <label className="label">Upload source files</label>
          <input
            className="input file"
            type="file"
            multiple
            accept=".txt,.eml,.csv,.md,.pdf,.docx,.xlsx,.xls,.html,.htm"
            onChange={(e) => onFilesChange(e.target.files)}
          />

          {isUploading && <p className="hint">Parsing uploaded files...</p>}

          {uploadedFiles.length > 0 && (
            <p className="hint">Loaded: {uploadedFiles.join(", ")}</p>
          )}

          <label className="label">Paste source text</label>
          <textarea
            className="textarea"
            value={sourceText}
            onChange={(e) => {
              setSourceText(e.target.value);
              setResult(null);
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 0.7fr",
              gap: "10px",
              marginTop: "16px",
            }}
          >
            <button
              className="button"
              style={{ marginTop: 0 }}
              onClick={extract}
              disabled={isUploading || isExtracting || !sourceText.trim()}
            >
              {isUploading
                ? "Parsing files..."
                : isExtracting
                  ? "Extracting..."
                  : "Auto-fill checklist"}
            </button>

            <button
              className="button"
              style={{ marginTop: 0, background: "#085153" }}
              onClick={exportHandoverChecklist}
              disabled={!result}
            >
              Export checklist
            </button>

            <button
              className="button"
              style={{ marginTop: 0, background: "#9f2534" }}
              onClick={resetAll}
            >
              Reset
            </button>
          </div>

          {error && <p className="error">{error}</p>}

          
        </div>

        <div className="panel">
          <div className="panelHeader">
            <div>
              <h2>2. Review Summary</h2>
              <p>
                AI should assist, not silently approve. These results are for
                human review.
              </p>
            </div>
          </div>

          {!result ? (
            <div className="empty">
              Run extraction to see risk, missing information, and Ops summary.
            </div>
          ) : (
            <div className="stack">
              <div className="summaryCards">
                <div className="metric">
                  <span>Status</span>
                  <strong className={badgeClass(result.review.overallStatus)}>
                    {statusLabels[result.review.overallStatus] ||
                      result.review.overallStatus}
                  </strong>
                </div>

                <div className="metric">
                  <span>Risk</span>
                  <strong className={badgeClass(result.review.riskLevel)}>
                    {result.review.riskLevel.toUpperCase()}
                  </strong>
                </div>

                <div className="metric">
                  <span>Progress</span>
                  <strong>
                    {progress?.complete}/{progress?.total}
                  </strong>
                </div>
              </div>

              <div>
                <h3>Executive Summary</h3>
                <p>{result.review.executiveSummary}</p>
              </div>

              <div>
                <h3>TBC / Review Items</h3>
                {result.review.tbcItems.length === 0 ? (
                  <p className="muted">None found.</p>
                ) : (
                  <ul>
                    {result.review.tbcItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3>Suggested Actions</h3>
                {result.review.suggestedActions.length === 0 ? (
                  <p className="muted">None found.</p>
                ) : (
                  <ul>
                    {result.review.suggestedActions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {result && (
        <>
          <section className="panel wide">
            <div className="panelHeader">
              <div>
                <h2>3. Header Fields</h2>
                <p>Each extracted value keeps evidence and confidence.</p>
              </div>
            </div>

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Extracted Value</th>
                    <th>Status</th>
                    <th>Confidence</th>
                    <th>Evidence</th>
                  </tr>
                </thead>

                <tbody>
                  {result.headerFields.map((field) => (
                    <tr key={field.fieldKey}>
                      <td>
                        <strong>{field.fieldLabel}</strong>
                      </td>
                      <td>
                        {field.extractedValue || (
                          <span className="muted">Not found</span>
                        )}
                      </td>
                      <td>
                        <span className={badgeClass(field.status)}>
                          {statusLabels[field.status] || field.status}
                        </span>
                      </td>
                      <td>{field.confidence}</td>
                      <td className="evidence">{field.evidenceText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel wide">
            <div className="panelHeader">
              <div>
                <h2>4. Autofilled Checklist</h2>
                <p>
                  This is the checklist table you can later save, approve,
                  export, or connect to your main app.
                </p>
              </div>
            </div>

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Item / Checklist</th>
                    <th>Status</th>
                    <th>Comments</th>
                    <th>Remarks</th>
                    <th>Evidence</th>
                  </tr>
                </thead>

                <tbody>
                  {result.checklistItems.map((item) => (
                    <tr key={`${item.category}-${item.itemLabel}`}>
                      <td>{item.category}</td>
                      <td>
                        <strong>{item.itemLabel}</strong>
                      </td>
                      <td>
                        <span className={badgeClass(item.suggestedStatus)}>
                          {statusLabels[item.suggestedStatus] ||
                            item.suggestedStatus}
                        </span>
                      </td>
                      <td>
                        {item.comments || (
                          <span className="muted">No comment extracted</span>
                        )}
                      </td>
                      <td>{item.remarks}</td>
                      <td className="evidence">{item.evidenceText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel wide">
            <div className="panelHeader">
              <div>
                <h2>5. Ops Summary</h2>
                <p>First draft generated from the source pack and checklist extraction.</p>
              </div>
            </div>

            <div className="opsSummary">{result.review.opsSummary}</div>

            <h3>Risk Flags</h3>
            {result.review.riskFlags.length === 0 ? (
              <p className="muted">No risk flags found.</p>
            ) : (
              <ul>
                {result.review.riskFlags.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
