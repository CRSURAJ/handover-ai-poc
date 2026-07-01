import ExcelJS from "exceljs";
import type { HandoverExtractionResult } from "@/lib/types";
import type { ScopeOfWorksResult } from "@/lib/sowTypes";
import { getSowSections } from "@/lib/sowSections";
import {
  getStatusCategory,
  getStatusLabel,
  type StatusValue,
} from "@/lib/handoverUi";
import { groupChecklistItems } from "@/lib/checklistGroups";

type BuildHandoverXlsxArgs = {
  result: HandoverExtractionResult;
  sourceName: string;
  sow?: ScopeOfWorksResult | null;
};

const FONT = "Segoe UI";
const COLS = 6;

// Brand palette (from the app's own teal/green identity), applied the way a
// business spreadsheet actually wants it: white canvas, color used to lead the eye.
const BRAND = "FF085153";
const BRAND_MID = "FF064445";
const ACCENT = "FF3EA978";
const INK = "FF1F2937";
const MUTED = "FF6B7280";
const LINE = "FFDCE3E1";
const ROW_ALT = "FFF3F8F6";
const WHITE = "FFFFFFFF";

// Excel's own well-known "Good / Bad / Neutral" cell-style colors — instantly
// readable as status to anyone who's used conditional formatting before.
const BADGE_COLORS: Record<string, { fill: string; font: string }> = {
  good: { fill: "FFC6EFCE", font: "FF006100" },
  warn: { fill: "FFFFEB9C", font: "FF9C6500" },
  bad: { fill: "FFFFC7CE", font: "FF9C0006" },
  neutral: { fill: "FFF2F2F2", font: "FF666666" },
};

// Mirrors the category colors already used in the live app's ChecklistTable.
const CATEGORY_COLORS: Record<string, { fill: string; font: string }> = {
  "Project Planning": { fill: "FFDDF6F0", font: "FF0F766E" },
  "Plant Area Info / Site Assessment": { fill: "FFE0F0FE", font: "FF0369A1" },
  Commissioning: { fill: "FFF1E8FE", font: "FF7C3AED" },
  Communications: { fill: "FFDFF6FA", font: "FF0E7490" },
};
const CATEGORY_FALLBACK = { fill: "FFF3F8F6", font: INK };

// Exhaustive value lists (not just whatever happens to be in the data) so
// conditional formatting still applies correctly if the user picks a status
// via the dropdown that wasn't present when the file was generated.
const ALL_FIELD_STATUSES: StatusValue[] = ["filled", "missing", "needs_review", "conflict"];
const ALL_CHECKLIST_STATUSES: StatusValue[] = [
  "complete",
  "pending",
  "tbc",
  "requires_review",
  "critical_issue",
  "not_applicable",
  "not_started",
];
const ALL_OVERALL_STATUSES: StatusValue[] = ["ok", "requires_review", "critical"];
const ALL_RISK_LEVELS: StatusValue[] = ["low", "medium", "high", "critical"];

// Dropdown option lists are derived from the same getStatusLabel() used by the
// conditional-formatting rules below, so the two can never drift out of sync
// (e.g. "Not applicable" vs the actual label "N/A").
const FIELD_STATUS_OPTIONS = ALL_FIELD_STATUSES.map(getStatusLabel).join(",");
const CHECKLIST_STATUS_OPTIONS = ALL_CHECKLIST_STATUSES.map(getStatusLabel).join(",");

export async function buildHandoverXlsxBuffer({
  result,
  sourceName,
  sow,
}: BuildHandoverXlsxArgs) {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Handover", {
    views: [{ showGridLines: false }],
  });

  // Wide over tall: generous column widths so most content fits without heavy
  // wrapping, rather than relying on very tall rows.
  sheet.columns = [
    { key: "a", width: 28 },
    { key: "b", width: 58 },
    { key: "c", width: 16 },
    { key: "d", width: 50 },
    { key: "e", width: 34 },
    { key: "f", width: 34 },
  ];

  let r = 1;
  let dataRowCount = 0;

  function fill(cell: ExcelJS.Cell, argb: string) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
  }

  function gridBorder(cell: ExcelJS.Cell) {
    const side = { style: "thin" as const, color: { argb: LINE } };
    cell.border = { top: side, left: side, bottom: side, right: side };
  }

  // Colors a status cell for its *initial* value only. Live recoloring as the
  // user edits the cell is handled separately by addStatusConditionalFormatting.
  function baseStatusStyle(cell: ExcelJS.Cell) {
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.font = { name: FONT, bold: true, color: { argb: INK } };
  }

  // Registers a live conditional-formatting rule per possible status value over
  // `ref` (an A1 range), so the fill/font recolor automatically the moment a
  // cell's text changes — e.g. via the Status dropdown — with no manual refresh.
  function addStatusConditionalFormatting(ref: string, values: StatusValue[]) {
    sheet.addConditionalFormatting({
      ref,
      rules: values.map((value, i) => {
        const colors = BADGE_COLORS[getStatusCategory(value)];
        return {
          priority: i + 1,
          type: "cellIs",
          operator: "equal",
          formulae: [`"${getStatusLabel(value)}"`],
          style: {
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: colors.fill } },
            font: { bold: true, color: { argb: colors.font } },
          },
        };
      }),
    });
  }

  // Estimates how many visual lines `text` wraps to inside a cell of `widthChars` wide
  // (Excel column widths are roughly in character units), so row height can fit it.
  // Deliberately generous: Excel's real wrapping breaks on word boundaries (not mid-word,
  // like a raw character count assumes) and merged cells often need more headroom than
  // the underlying column width suggests, so this errs toward too-tall over cut-off text.
  const WRAP_SAFETY_FACTOR = 0.55;
  const LINE_HEIGHT_PT = 18;
  const ROW_PADDING_PT = 10;

  function countWrappedLines(text: string, widthChars: number) {
    const effectiveWidth = Math.max(8, widthChars * WRAP_SAFETY_FACTOR);
    return text.split("\n").reduce((total, line) => {
      if (!line) return total + 1;
      return total + Math.max(1, Math.ceil(line.length / effectiveWidth));
    }, 0);
  }

  function estimateRowHeight(wrappedLines: number) {
    return wrappedLines * LINE_HEIGHT_PT + ROW_PADDING_PT;
  }

  function titleRow(text: string) {
    sheet.mergeCells(r, 1, r, COLS);
    const cell = sheet.getCell(r, 1);
    cell.value = text;
    cell.font = { name: FONT, bold: true, size: 18, color: { argb: BRAND } };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "medium", color: { argb: ACCENT } } };
    sheet.getRow(r).height = 30;
    r += 2;
  }

  function sectionHeader(text: string) {
    sheet.mergeCells(r, 1, r, COLS);
    const cell = sheet.getCell(r, 1);
    cell.value = text.toUpperCase();
    cell.font = { name: FONT, bold: true, size: 11, color: { argb: WHITE } };
    fill(cell, BRAND_MID);
    cell.alignment = { vertical: "middle", indent: 1 };
    sheet.getRow(r).height = 22;
    r += 1;
  }

  function tableHeaderRow(labels: string[]) {
    labels.forEach((label, i) => {
      const cell = sheet.getCell(r, i + 1);
      cell.value = label;
      cell.font = { name: FONT, bold: true, size: 10, color: { argb: WHITE } };
      fill(cell, BRAND);
      cell.alignment = { vertical: "middle" };
      gridBorder(cell);
    });
    sheet.getRow(r).height = 20;
    r += 1;
  }

  function dataRow(
    values: string[],
    opts: {
      wrap?: boolean;
      dropdownCol?: number;
      dropdownOptions?: string;
      height?: number;
      statusCol?: number;
    } = {},
  ) {
    const zebra = dataRowCount % 2 === 1;
    values.forEach((v, i) => {
      const cell = sheet.getCell(r, i + 1);
      cell.value = v;
      cell.alignment = { wrapText: !!opts.wrap, vertical: "top" };
      cell.font = { name: FONT, color: { argb: INK } };
      fill(cell, zebra ? ROW_ALT : WHITE);
      gridBorder(cell);
    });
    if (opts.dropdownCol && opts.dropdownOptions) {
      sheet.getCell(r, opts.dropdownCol).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${opts.dropdownOptions}"`],
      };
    }
    if (opts.statusCol) {
      baseStatusStyle(sheet.getCell(r, opts.statusCol));
    }
    if (opts.height) sheet.getRow(r).height = opts.height;
    dataRowCount += 1;
    r += 1;
  }

  function blank(n = 1) {
    r += n;
  }

  const projectName =
    result.headerFields.find((field) => field.fieldKey === "projectName")
      ?.extractedValue || sourceName || "Handover Checklist";

  titleRow(`Advisory Project Critical Checklist — ${projectName}`);

  // ---- Project Details ----
  sectionHeader("Project Details");
  tableHeaderRow(["Field", "Value", "Status", "Confidence", "", ""]);
  dataRowCount = 0;
  const headerFieldsFirstRow = r;
  result.headerFields.forEach((field) => {
    dataRow(
      [field.fieldLabel, field.extractedValue || "Not found", getStatusLabel(field.status), field.confidence, "", ""],
      { dropdownCol: 3, dropdownOptions: FIELD_STATUS_OPTIONS, statusCol: 3 },
    );
  });
  const headerFieldsLastRow = r - 1;
  if (headerFieldsLastRow >= headerFieldsFirstRow) {
    addStatusConditionalFormatting(
      `C${headerFieldsFirstRow}:C${headerFieldsLastRow}`,
      ALL_FIELD_STATUSES,
    );
  }
  blank();

  // ---- Review Summary ----
  sectionHeader("Review Summary");

  ["Overall Status", "Risk Level", "Progress", "", "", ""].forEach((label, i) => {
    if (!label) return;
    const cell = sheet.getCell(r, i + 1);
    cell.value = label.toUpperCase();
    cell.font = { name: FONT, bold: true, size: 9, color: { argb: MUTED } };
    gridBorder(cell);
  });
  r += 1;

  const metricsRow = r;
  const overallCell = sheet.getCell(r, 1);
  overallCell.value = getStatusLabel(result.review.overallStatus);
  baseStatusStyle(overallCell);
  gridBorder(overallCell);
  addStatusConditionalFormatting(`A${metricsRow}:A${metricsRow}`, ALL_OVERALL_STATUSES);

  const riskCell = sheet.getCell(r, 2);
  riskCell.value = getStatusLabel(result.review.riskLevel);
  baseStatusStyle(riskCell);
  gridBorder(riskCell);
  addStatusConditionalFormatting(`B${metricsRow}:B${metricsRow}`, ALL_RISK_LEVELS);

  // The formula is filled in once the Checklist section below tells us which
  // rows its Status column occupies — this cell recalculates live in Excel as
  // the user changes checklist statuses via the dropdown.
  const progressCell = sheet.getCell(r, 3);
  progressCell.font = { name: FONT, bold: true, color: { argb: ACCENT } };
  gridBorder(progressCell);
  sheet.mergeCells(r, 3, r, COLS);
  r += 1;
  blank();

  // TBC / Review Items and Suggested Actions each get a merged block (A:C and
  // D:F) so the header spans the same columns as its content underneath.
  sheet.mergeCells(r, 1, r, 3);
  const tbcHeaderCell = sheet.getCell(r, 1);
  tbcHeaderCell.value = "TBC / Review Items";
  tbcHeaderCell.font = { name: FONT, bold: true, size: 10, color: { argb: WHITE } };
  fill(tbcHeaderCell, BRAND);
  tbcHeaderCell.alignment = { vertical: "middle" };
  gridBorder(tbcHeaderCell);

  sheet.mergeCells(r, 4, r, 6);
  const actionsHeaderCell = sheet.getCell(r, 4);
  actionsHeaderCell.value = "Suggested Actions";
  actionsHeaderCell.font = { name: FONT, bold: true, size: 10, color: { argb: WHITE } };
  fill(actionsHeaderCell, BRAND);
  actionsHeaderCell.alignment = { vertical: "middle" };
  gridBorder(actionsHeaderCell);
  sheet.getRow(r).height = 20;
  r += 1;

  const tbcItems = result.review.tbcItems.length ? result.review.tbcItems : ["None found."];
  const suggestedActions = result.review.suggestedActions.length
    ? result.review.suggestedActions
    : ["None found."];
  const reviewRowCount = Math.max(tbcItems.length, suggestedActions.length);
  const tbcColWidth =
    (sheet.getColumn(1).width ?? 28) + (sheet.getColumn(2).width ?? 58) + (sheet.getColumn(3).width ?? 16);
  const actionsColWidth =
    (sheet.getColumn(4).width ?? 50) + (sheet.getColumn(5).width ?? 34) + (sheet.getColumn(6).width ?? 34);
  let reviewZebra = false;
  for (let i = 0; i < reviewRowCount; i++) {
    const tbcText = tbcItems[i] ?? "";
    const actionText = suggestedActions[i] ?? "";
    const wrappedLines = Math.max(
      countWrappedLines(tbcText, tbcColWidth),
      countWrappedLines(actionText, actionsColWidth),
    );
    const rowFill = reviewZebra ? ROW_ALT : WHITE;
    reviewZebra = !reviewZebra;

    sheet.mergeCells(r, 1, r, 3);
    const tbcCell = sheet.getCell(r, 1);
    tbcCell.value = tbcText;
    tbcCell.alignment = { wrapText: true, vertical: "top" };
    tbcCell.font = { name: FONT, color: { argb: INK } };
    fill(tbcCell, rowFill);
    gridBorder(tbcCell);

    sheet.mergeCells(r, 4, r, 6);
    const actionCell = sheet.getCell(r, 4);
    actionCell.value = actionText;
    actionCell.alignment = { wrapText: true, vertical: "top" };
    actionCell.font = { name: FONT, color: { argb: INK } };
    fill(actionCell, rowFill);
    gridBorder(actionCell);

    sheet.getRow(r).height = estimateRowHeight(wrappedLines);
    r += 1;
  }
  blank();

  // ---- Checklist ----
  sectionHeader("Checklist");
  tableHeaderRow(["Category", "Item", "Status", "Comments", "Remarks", "Handover Meeting"]);
  dataRowCount = 0;
  const itemColWidth = sheet.getColumn(2).width ?? 58;
  const commentsColWidth = sheet.getColumn(4).width ?? 50;
  const remarksColWidth = sheet.getColumn(5).width ?? 34;
  const checklistFirstDataRow = r;
  groupChecklistItems(result).forEach(({ category, indices }) => {
    const startRow = r;
    indices.forEach((index) => {
      const item = result.checklistItems[index];
      const wrappedLines = Math.max(
        countWrappedLines(item.itemLabel, itemColWidth),
        countWrappedLines(item.comments || "", commentsColWidth),
        countWrappedLines(item.remarks || "", remarksColWidth),
      );
      dataRow(
        [
          category,
          item.itemLabel,
          getStatusLabel(item.suggestedStatus),
          item.comments || "",
          item.remarks || "",
          "",
        ],
        {
          wrap: true,
          dropdownCol: 3,
          dropdownOptions: CHECKLIST_STATUS_OPTIONS,
          statusCol: 3,
          height: estimateRowHeight(wrappedLines),
        },
      );
    });
    const endRow = r - 1;
    if (endRow > startRow) {
      sheet.mergeCells(startRow, 1, endRow, 1);
    }
    const categoryCell = sheet.getCell(startRow, 1);
    const catColors = CATEGORY_COLORS[category] ?? CATEGORY_FALLBACK;
    categoryCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    categoryCell.font = { name: FONT, bold: true, color: { argb: catColors.font } };
    fill(categoryCell, catColors.fill);
    gridBorder(categoryCell);
  });
  const checklistLastDataRow = r - 1;
  if (checklistLastDataRow >= checklistFirstDataRow) {
    addStatusConditionalFormatting(
      `C${checklistFirstDataRow}:C${checklistLastDataRow}`,
      ALL_CHECKLIST_STATUSES,
    );
  }

  // Fill in the Progress formula now that we know the Checklist's Status column
  // range — it recalculates live in Excel whenever a status is changed.
  const totalItems = result.checklistItems.length;
  const completeItems = result.checklistItems.filter(
    (item) => item.suggestedStatus === "complete",
  ).length;
  const cachedPercent = totalItems > 0 ? Math.round((completeItems / totalItems) * 100) : 0;
  const cachedFilledSeg = Math.round(cachedPercent / 10);
  const cachedResult =
    totalItems > 0
      ? `${"█".repeat(cachedFilledSeg)}${"░".repeat(10 - cachedFilledSeg)}  ${completeItems}/${totalItems} (${cachedPercent}%)`
      : "No checklist items";

  const statusRange = `C${checklistFirstDataRow}:C${checklistLastDataRow}`;
  const completeCount = `COUNTIF(${statusRange},"Complete")`;
  const percentExpr = totalItems > 0 ? `ROUND(${completeCount}/${totalItems}*100,0)` : "0";
  const filledSegExpr = `ROUND(${percentExpr}/10,0)`;
  progressCell.value = {
    formula:
      totalItems > 0
        ? `REPT("█",${filledSegExpr})&REPT("░",10-${filledSegExpr})&"  "&${completeCount}&"/${totalItems} ("&${percentExpr}&"%)"`
        : `"No checklist items"`,
    result: cachedResult,
  };

  blank();

  // ---- Scope of Works ----
  if (sow) {
    const titleColWidth = sheet.getColumn(1).width ?? 28;
    const contentColWidth = [2, 3, 4, 5, 6].reduce(
      (sum, c) => sum + (sheet.getColumn(c).width ?? 20),
      0,
    );

    sectionHeader("Scope of Works");
    dataRowCount = 0;
    getSowSections(sow).forEach((section, i) => {
      const lines: string[] = [];
      section.paragraphs?.forEach((p) => lines.push(p));
      section.subBlocks?.forEach((sb) => {
        if (sb.subtitle) lines.push(sb.subtitle);
        if (sb.description) lines.push(sb.description);
        sb.items.forEach((item) => lines.push(`• ${item}`));
      });
      section.items?.forEach((item) => lines.push(`• ${item}`));

      const titleText = `${i + 1}. ${section.title}`;
      const contentText = lines.join("\n");
      const wrappedLines = Math.max(
        countWrappedLines(titleText, titleColWidth),
        countWrappedLines(contentText, contentColWidth),
      );

      dataRow([titleText, contentText, "", "", "", ""], {
        wrap: true,
        height: estimateRowHeight(wrappedLines),
      });
      sheet.mergeCells(r - 1, 2, r - 1, COLS);
      sheet.getCell(r - 1, 1).font = { name: FONT, bold: true, color: { argb: BRAND_MID } };
    });

    if (sow.footerNote) {
      const footerWrappedLines = countWrappedLines(
        sow.footerNote,
        titleColWidth + contentColWidth,
      );
      dataRow([sow.footerNote, "", "", "", "", ""], {
        wrap: true,
        height: estimateRowHeight(footerWrappedLines),
      });
      sheet.mergeCells(r - 1, 1, r - 1, COLS);
      const footerCell = sheet.getCell(r - 1, 1);
      footerCell.font = { name: FONT, italic: true, color: { argb: MUTED } };
    }
  }

  return wb.xlsx.writeBuffer();
}
