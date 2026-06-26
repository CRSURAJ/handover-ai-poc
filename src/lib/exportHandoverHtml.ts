import type { HandoverExtractionResult } from "@/lib/types";
import type { ChecklistProgress } from "@/lib/handoverProgress";
import { escapeHtml, statusLabels } from "@/lib/handoverUi";


type BuildHandoverHtmlArgs = {
  result: HandoverExtractionResult;
  sourceName: string;
  progress: ChecklistProgress | null;
};

function listItems(items: string[]) {
  if (!items.length) {
    return "<li>None found.</li>";
  }

  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

export function getHandoverProjectName(
  result: HandoverExtractionResult,
  sourceName: string,
) {
  return (
    result.headerFields.find((field) => field.fieldKey === "projectName")
      ?.extractedValue ||
    sourceName ||
    "Handover Checklist"
  );
}

export function buildHandoverHtml({
  result,
  sourceName,
  progress,
}: BuildHandoverHtmlArgs) {
  const projectName = getHandoverProjectName(result, sourceName);

  const customer =
    result.headerFields.find((field) => field.fieldKey === "customer")
      ?.extractedValue || "";

  const headerRows = result.headerFields
    .map(
      (field) => `
        <tr>
          <td>${escapeHtml(field.fieldLabel)}</td>
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
          <td>${escapeHtml(item.itemLabel)}</td>
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

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(projectName)} - Handover Checklist</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 32px;
      color: #17312f;
      line-height: 1.45;
    }

    h1, h2, h3 {
      color: #11302D;
    }

    .meta,
    .summary {
      border: 1px solid #d9cdc7;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 24px;
      background: #f7faf9;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 28px;
      font-size: 13px;
    }

    th,
    td {
      border: 1px solid #d9cdc7;
      padding: 8px;
      vertical-align: top;
      text-align: left;
    }

    th {
      background: #11302D;
      color: white;
    }

    .footer {
      margin-top: 32px;
      font-size: 12px;
      color: #5f6f6c;
    }
  </style>
</head>

<body>
  <h1>Advisory Project Critical Checklist</h1>

  <div class="meta">
    <p><strong>Project:</strong> ${escapeHtml(projectName)}</p>
    <p><strong>Customer:</strong> ${escapeHtml(customer)}</p>
    <p><strong>Template:</strong> ${escapeHtml(result.templateName)} — Rev ${escapeHtml(result.templateRevision)}</p>
    <p><strong>Source Pack:</strong> ${escapeHtml(sourceName)}</p>
    <p><strong>Exported:</strong> ${escapeHtml(new Date().toLocaleString())}</p>
  </div>

  <h2>Review Summary</h2>

  <div class="summary">
    <p><strong>Status:</strong> ${escapeHtml(
      statusLabels[result.review.overallStatus] || result.review.overallStatus,
    )}</p>
    <p><strong>Risk:</strong> ${escapeHtml(result.review.riskLevel.toUpperCase())}</p>
    <p><strong>Progress:</strong> ${escapeHtml(`${progress?.complete ?? 0}/${progress?.total ?? 0}`)}</p>
    <p>${escapeHtml(result.review.executiveSummary)}</p>

    <h3>TBC / Review Items</h3>
    <ul>${listItems(result.review.tbcItems)}</ul>

    <h3>Missing Items</h3>
    <ul>${listItems(result.review.missingItems)}</ul>

    <h3>Suggested Actions</h3>
    <ul>${listItems(result.review.suggestedActions)}</ul>
  </div>

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
    <tbody>${headerRows}</tbody>
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
    <tbody>${checklistRows}</tbody>
  </table>

  <h2>Ops Summary</h2>
  <p>${escapeHtml(result.review.opsSummary)}</p>

  <h3>Risk Flags</h3>
  <ul>${listItems(result.review.riskFlags)}</ul>

  <p class="footer">
    Generated from HandoverAI. AI-assisted extraction requires human review before approval.
  </p>
</body>
</html>`;
}
