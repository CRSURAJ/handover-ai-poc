"use client";

import { useMemo, useState } from "react";
import type { HandoverExtractionResult } from "@/lib/types";

const initialSourceText = "";

const statusLabels: Record<string, string> = {
  filled: "Filled",
  missing: "Missing",
  needs_review: "Needs review",
  conflict: "Conflict",
  not_started: "Not started",
  complete: "Complete",
  pending: "Pending",
  tbc: "TBC",
  requires_review: "Requires review",
  critical_issue: "Critical issue",
  not_applicable: "N/A",
  ok: "OK",
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

function badgeClass(value: string) {
  if (["filled", "complete", "ok", "low"].includes(value)) return "badge good";

  if (
    [
      "needs_review",
      "pending",
      "tbc",
      "requires_review",
      "medium",
      "high",
    ].includes(value)
  ) {
    return "badge warn";
  }

  if (["missing", "conflict", "critical_issue", "critical"].includes(value)) {
    return "badge bad";
  }

  return "badge";
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makeFileName(value: string) {
  const safeName = value
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  const date = new Date().toISOString().slice(0, 10);
  return `${safeName || "handover-checklist"}-${date}.html`;
}

function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

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

    const projectName =
      result.headerFields.find((field) => field.fieldKey === "projectName")
        ?.extractedValue ||
      sourceName ||
      "Handover Checklist";

    const customer =
      result.headerFields.find((field) => field.fieldKey === "customer")
        ?.extractedValue || "";

    const headerRows = result.headerFields
      .map(
        (field) => `
          <tr>
            <td><strong>${escapeHtml(field.fieldLabel)}</strong></td>
            <td>${escapeHtml(field.extractedValue || "Not found")}</td>
            <td>${escapeHtml(statusLabels[field.status] || field.status)}</td>
            <td>${escapeHtml(field.confidence)}</td>
            <td>${escapeHtml(field.evidenceText)}</td>
          </tr>
        `,
      )
      .join("");

    const checklistRows = result.checklistItems
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.category)}</td>
            <td><strong>${escapeHtml(item.itemLabel)}</strong></td>
            <td>${escapeHtml(
              statusLabels[item.suggestedStatus] || item.suggestedStatus,
            )}</td>
            <td>${escapeHtml(item.comments || "")}</td>
            <td>${escapeHtml(item.remarks || "")}</td>
            <td>${escapeHtml(item.evidenceText || "")}</td>
          </tr>
        `,
      )
      .join("");

    const tbcItems = result.review.tbcItems
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");

    const missingItems = result.review.missingItems
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");

    const suggestedActions = result.review.suggestedActions
      .map((action) => `<li>${escapeHtml(action)}</li>`)
      .join("");

    const riskFlags = result.review.riskFlags
      .map((risk) => `<li>${escapeHtml(risk)}</li>`)
      .join("");

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(projectName)} - Handover Checklist</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #102622;
      margin: 32px;
      line-height: 1.45;
    }

    h1 {
      margin-bottom: 4px;
      color: #11302d;
    }

    h2 {
      margin-top: 28px;
      color: #11302d;
      border-bottom: 2px solid #53bc7b;
      padding-bottom: 6px;
    }

    h3 {
      color: #11302d;
      margin-top: 20px;
    }

    .meta {
      color: #555;
      margin-bottom: 20px;
    }

    .summary {
      background: #f4faf7;
      border: 1px solid #d9e3df;
      border-radius: 10px;
      padding: 14px;
      margin: 18px 0;
      white-space: pre-wrap;
    }

    .statusBox {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin: 18px 0;
    }

    .metric {
      border: 1px solid #d9e3df;
      border-radius: 10px;
      padding: 12px;
      background: #fbfdfc;
    }

    .metric span {
      display: block;
      color: #667;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .metric strong {
      color: #11302d;
      font-size: 16px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 12px;
    }

    th,
    td {
      border: 1px solid #d9e3df;
      padding: 8px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #eef4f2;
      color: #11302d;
    }

    ul {
      margin-top: 8px;
    }

    .footer {
      margin-top: 32px;
      color: #666;
      font-size: 11px;
    }

    @media print {
      body {
        margin: 16mm;
      }

      table {
        page-break-inside: auto;
      }

      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>
  <h1>Advisory Project Critical Checklist</h1>
  <div class="meta">
    <strong>Project:</strong> ${escapeHtml(projectName)}<br />
    <strong>Customer:</strong> ${escapeHtml(customer)}<br />
    <strong>Template:</strong> ${escapeHtml(result.templateName)} — Rev ${escapeHtml(result.templateRevision)}<br />
    <strong>Source Pack:</strong> ${escapeHtml(sourceName)}<br />
    <strong>Exported:</strong> ${escapeHtml(new Date().toLocaleString())}<br />
  </div>

  <h2>Review Summary</h2>

  <div class="statusBox">
    <div class="metric">
      <span>Status</span>
      <strong>${escapeHtml(statusLabels[result.review.overallStatus] || result.review.overallStatus)}</strong>
    </div>
    <div class="metric">
      <span>Risk</span>
      <strong>${escapeHtml(result.review.riskLevel.toUpperCase())}</strong>
    </div>
    <div class="metric">
      <span>Progress</span>
      <strong>${escapeHtml(`${progress?.complete ?? 0}/${progress?.total ?? 0}`)}</strong>
    </div>
    <div class="metric">
      <span>Mode</span>
    </div>
  </div>

  <div class="summary">${escapeHtml(result.review.executiveSummary)}</div>

  <h3>TBC / Review Items</h3>
  <ul>${tbcItems || "<li>None found.</li>"}</ul>

  <h3>Missing Items</h3>
  <ul>${missingItems || "<li>None found.</li>"}</ul>

  <h3>Suggested Actions</h3>
  <ul>${suggestedActions || "<li>None found.</li>"}</ul>

  <h2>Header Fields</h2>
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
      ${headerRows}
    </tbody>
  </table>

  <h2>Autofilled Checklist</h2>
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
      ${checklistRows}
    </tbody>
  </table>

  <h2>Ops Summary</h2>
  <div class="summary">${escapeHtml(result.review.opsSummary)}</div>

  <h3>Risk Flags</h3>
  <ul>${riskFlags || "<li>None found.</li>"}</ul>

  <div class="footer">
    Generated from HandoverAI. AI-assisted extraction requires human review before approval.
  </div>
</body>
</html>`;

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
