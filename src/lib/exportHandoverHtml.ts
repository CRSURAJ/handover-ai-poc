import type { HandoverExtractionResult } from "@/lib/types";
import type { ChecklistProgress } from "@/lib/handoverProgress";
import type { ScopeOfWorksResult } from "@/lib/sowTypes";
import { getSowSections, type SowSectionData } from "@/lib/sowSections";
import { groupChecklistItems } from "@/lib/checklistGroups";
import {
  escapeHtml,
  getStatusCategory,
  getStatusLabel,
  type StatusValue,
} from "@/lib/handoverUi";

type BuildHandoverHtmlArgs = {
  result: HandoverExtractionResult;
  sourceName: string;
  progress: ChecklistProgress | null;
  sow?: ScopeOfWorksResult | null;
};

function listItems(items: string[]) {
  if (!items.length) {
    return "<li>None found.</li>";
  }

  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function statusBadge(value: StatusValue) {
  const category = getStatusCategory(value);
  return `<span class="badge badge--${category}">${escapeHtml(getStatusLabel(value))}</span>`;
}

function sowList(items: string[]) {
  if (!items.length) return "";
  return `<ul class="sowList">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderSowSection(num: number, section: SowSectionData) {
  let body = "";

  if (section.notice) {
    body = `<div class="sowNotice">${escapeHtml(section.paragraphs?.[0] ?? "")}</div>`;
  } else {
    if (section.paragraphs) {
      body += section.paragraphs.map((p) => `<p class="sowPara">${escapeHtml(p)}</p>`).join("");
    }
    if (section.subBlocks) {
      body += section.subBlocks
        .map(
          (sec) => `
            <div class="sowSubBlock">
              ${sec.subtitle ? `<p class="sowSubtitle">${escapeHtml(sec.subtitle)}</p>` : ""}
              ${sec.description ? `<p class="sowPara">${escapeHtml(sec.description)}</p>` : ""}
              ${sowList(sec.items)}
            </div>
          `,
        )
        .join("");
    }
    if (section.items) {
      body += sowList(section.items);
    }
  }

  return `
    <div class="sowSection">
      <h3 class="sowSectionTitle"><span class="sowSectionNum">${num}</span>${escapeHtml(section.title)}</h3>
      ${body}
    </div>
  `;
}

function buildSowHtml(sow: ScopeOfWorksResult) {
  const sectionsHtml = getSowSections(sow)
    .map((section, i) => renderSowSection(i + 1, section))
    .join("");

  return `
    <h2>Scope of Works</h2>
    <div class="sowDoc">
      ${sectionsHtml}
      ${sow.footerNote ? `<p class="sowFooterNote">${escapeHtml(sow.footerNote)}</p>` : ""}
    </div>
  `;
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
  sow,
}: BuildHandoverHtmlArgs) {
  const projectName = getHandoverProjectName(result, sourceName);

  const headerRows = result.headerFields
    .map(
      (field) => `
        <tr>
          <td>${escapeHtml(field.fieldLabel)}</td>
          <td>${escapeHtml(field.extractedValue || "Not found")}</td>
          <td>${statusBadge(field.status)}</td>
          <td>${escapeHtml(field.confidence)}</td>
          <td>${escapeHtml(field.evidenceText)}</td>
        </tr>
      `,
    )
    .join("");

  const checklistRows = groupChecklistItems(result)
    .map(({ category, indices }) =>
      indices
        .map((index, pos) => {
          const item = result.checklistItems[index];
          return `
            <tr>
              ${pos === 0 ? `<td class="categoryCell" rowspan="${indices.length}">${escapeHtml(category)}</td>` : ""}
              <td>${escapeHtml(item.itemLabel)}</td>
              <td>${statusBadge(item.suggestedStatus)}</td>
              <td>${escapeHtml(item.comments || "")}</td>
              <td>${escapeHtml(item.remarks || "")}</td>
              <td>${escapeHtml(item.evidenceText || "")}</td>
              <td></td>
            </tr>
          `;
        })
        .join(""),
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(projectName)} - Handover Checklist</title>
  <style>
    :root {
      --bg: #0a2220;
      --surface: #11302d;
      --ink: #eef7f3;
      --ink2: rgba(238, 247, 243, .66);
      --muted: rgba(238, 247, 243, .52);
      --line: rgba(178, 223, 220, .18);
      --brand: #085153;
      --brand-mid: #064445;
      --accent: #53bc7b;
      --accent-dark: #3ea978;
      --good: #62d39a;
      --good-bg: rgba(83, 188, 123, .12);
      --good-border: rgba(83, 188, 123, .30);
      --warn: #e2ad3f;
      --warn-bg: rgba(226, 173, 63, .12);
      --warn-border: rgba(226, 173, 63, .32);
      --bad: #a63a3a;
      --bad-bg: rgba(166, 58, 58, .12);
      --bad-border: rgba(166, 58, 58, .32);
      --r-sm: 10px;
      --r-md: 14px;
      --r-lg: 18px;
    }

    @page {
      size: A3;
      margin: 18mm;
    }

    * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }

    body {
      font-family: "Segoe UI", Arial, sans-serif;
      margin: 0;
      color: var(--ink);
      line-height: 1.5;
      background: var(--bg);
    }

    .page {
      max-width: 1500px;
      margin: 0 auto;
      padding: 24px 40px 40px;
    }

    .brandBar {
      background: var(--brand);
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 40px;
      margin-bottom: 40px;
    }

    .brandBar--footer {
      margin-bottom: 0;
      margin-top: 40px;
    }

    .brandMark {
      width: 34px;
      height: 34px;
      background: var(--accent);
      border-radius: var(--r-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 15px;
      color: var(--brand);
      flex-shrink: 0;
    }

    .brandTitle {
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.02em;
      color: rgba(255, 255, 255, 0.9);
    }

    .brandSubtitle {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(255, 255, 255, 0.5);
    }

    h1 {
      color: var(--ink);
      font-size: 24px;
      margin: 0 0 20px;
      border-bottom: 3px solid var(--accent-dark);
      padding-bottom: 12px;
    }

    h2 {
      color: var(--ink);
      font-size: 18px;
      font-weight: 700;
      margin: 32px 0 14px;
      padding-left: 12px;
      border-left: 4px solid var(--accent-dark);
    }

    h3 {
      color: var(--ink2);
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 16px 0 8px;
    }

    .summaryCards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      padding: 20px;
    }

    .metric {
      border: 1px solid var(--line);
      border-radius: var(--r-md);
      padding: 14px 16px;
      background: var(--surface);
    }

    .metric span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      margin-bottom: 8px;
    }

    .metric strong {
      font-size: 20px;
      font-weight: 700;
      display: block;
      margin-bottom: 6px;
    }

    .progressWrap {
      height: 5px;
      background: var(--line);
      border-radius: 999px;
      overflow: hidden;
      margin-top: 6px;
    }

    .progressBar {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-dark), var(--accent));
      border-radius: 999px;
      min-width: 4px;
    }

    .tableWrap {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: var(--r-lg);
      background: var(--surface);
      margin: 10px 0 24px;
    }

    .sowDoc {
      border: 1px solid var(--line);
      border-radius: var(--r-lg);
      background: var(--surface);
      margin: 10px 0 24px;
      padding: 6px 20px;
    }

    .printShell {
      width: 100%;
      border-collapse: collapse;
    }

    .printShell > thead > tr > td,
    .printShell > tbody > tr > td,
    .printShell > tfoot > tr > td {
      padding: 0;
      border: none;
      background: transparent;
    }

    .tableWrap table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .tableWrap thead tr {
      background: rgba(178, 223, 220, .05);
      border-bottom: 1px solid var(--line);
    }

    .tableWrap th {
      padding: 12px 16px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      color: var(--ink2);
      font-weight: 700;
      text-align: left;
    }

    .tableWrap td {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(178, 223, 220, .08);
      border-right: 1px solid rgba(255, 255, 255, .04);
      vertical-align: top;
      text-align: left;
      color: var(--ink);
    }

    .tableWrap td:last-child {
      border-right: 0;
    }

    .categoryCell {
      text-align: center;
      vertical-align: middle;
      font-weight: 700;
      background: rgba(178, 223, 220, .05);
    }

    .tableWrap tr:last-child td {
      border-bottom: 0;
    }

    .tableWrap tr {
      break-inside: avoid;
    }

    thead {
      display: table-header-group;
    }

    tfoot {
      display: table-footer-group;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
      border-radius: 999px;
      padding: 3px 9px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
      border: 1px solid transparent;
      background: var(--bg);
      color: var(--muted);
    }

    .badge--good {
      color: #0a2018;
      background: #4ade80;
      border-color: #4ade80;
    }

    .badge--warn {
      color: #000000 !important;
      background: #fbbf24;
      border-color: #fbbf24;
    }

    .badge--bad {
      color: #fff;
      background: #ef4444;
      border-color: #ef4444;
    }

    .sowSection {
      padding: 14px 0;
      margin-bottom: 4px;
      break-inside: avoid;
    }

    .sowSection + .sowSection {
      border-top: 1px solid var(--line);
      padding-top: 18px;
    }

    .sowSectionTitle {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 700;
      color: var(--ink);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 10px;
    }

    .sowSectionNum {
      width: 22px;
      height: 22px;
      background: var(--accent-dark);
      color: #0a1f1a;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 11px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .sowSubBlock {
      margin-bottom: 12px;
    }

    .sowSubtitle {
      font-size: 13px;
      font-weight: 700;
      color: var(--ink2);
      margin: 0 0 6px;
    }

    .sowPara {
      font-size: 14px;
      color: var(--ink2);
      line-height: 1.65;
      margin: 0 0 8px;
    }

    .sowNotice {
      margin: 4px 0 8px;
      padding: 10px 14px;
      background: var(--good-bg);
      border: 1px solid var(--good-border);
      border-radius: var(--r-sm);
      font-size: 13px;
      color: var(--accent);
      font-weight: 500;
    }

    .sowList {
      margin: 0 0 8px;
      padding-left: 34px;
    }

    .sowList li {
      font-size: 14px;
      color: var(--ink2);
      line-height: 1.6;
      margin-bottom: 4px;
    }

    .sowFooterNote {
      font-size: 12px;
      color: var(--muted);
      font-style: italic;
      border-top: 1px solid var(--line);
      padding-top: 16px;
      margin-top: 24px;
    }

    .muted {
      color: var(--muted);
      font-size: 13px;
    }

    .footer {
      margin-top: 32px;
      font-size: 12px;
      color: var(--muted);
    }

    .printBtn {
      position: fixed;
      top: 14px;
      right: 14px;
      background: var(--accent);
      color: var(--brand);
      border: none;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    }

    @media print {
      .page {
        max-width: none;
        padding: 0 28px 28px;
      }

      .brandBar {
        padding: 18px 28px;
        margin-bottom: 40px;
      }

      .brandBar--footer {
        margin-bottom: 0;
        margin-top: 40px;
      }

      h2 {
        break-after: avoid;
      }

      .tableWrap,
      .sowSection {
        break-inside: avoid;
      }

      .no-print {
        display: none !important;
      }
    }
  </style>
</head>

<body>
  <button class="printBtn no-print" onclick="window.print()">🖨 Save as PDF</button>

  <table class="printShell">
    <thead>
      <tr>
        <td>
          <div class="brandBar">
            <div class="brandMark">H</div>
            <div>
              <div class="brandTitle">HandoverAI</div>
              <div class="brandSubtitle">Sales → Operations Handover</div>
            </div>
          </div>
        </td>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
  <div class="page">
    <h1>Advisory Project Critical Checklist</h1>

    <h2>Project Details</h2>

    <div class="tableWrap">
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
    </div>

    <h2>Review Summary</h2>

    <div class="tableWrap">
      <div class="summaryCards">
        <div class="metric">
          <span>Overall Status</span>
          <strong>${statusBadge(result.review.overallStatus)}</strong>
        </div>
        <div class="metric">
          <span>Risk Level</span>
          <strong>${statusBadge(result.review.riskLevel)}</strong>
        </div>
        <div class="metric">
          <span>Progress</span>
          <strong>${escapeHtml(`${progress?.complete ?? 0} / ${progress?.total ?? 0}`)}</strong>
          <div class="progressWrap">
            <div class="progressBar" style="width: ${progress?.percent ?? 0}%"></div>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>TBC / Review Items</th>
            <th>Suggested Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${result.review.tbcItems.length === 0 ? '<span class="muted">None found.</span>' : `<ul class="sowList">${listItems(result.review.tbcItems)}</ul>`}</td>
            <td>${result.review.suggestedActions.length === 0 ? '<span class="muted">None found.</span>' : `<ul class="sowList">${listItems(result.review.suggestedActions)}</ul>`}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>Checklist</h2>

    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Item / Checklist</th>
            <th>Status</th>
            <th>Comments</th>
            <th>Remarks</th>
            <th>Evidence</th>
            <th>Handover Meeting</th>
          </tr>
        </thead>
        <tbody>${checklistRows}</tbody>
      </table>
    </div>

    ${sow ? buildSowHtml(sow) : ""}

    <p class="footer">
      Generated from HandoverAI. AI-assisted extraction requires human review before approval.
    </p>
  </div>
        </td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <td>
          <div class="brandBar brandBar--footer">
            <div class="brandMark">H</div>
            <div>
              <div class="brandTitle">HandoverAI</div>
              <div class="brandSubtitle">Sales → Operations Handover</div>
            </div>
          </div>
        </td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;
}
