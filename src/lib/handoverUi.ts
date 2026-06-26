import type {
  ChecklistStatus,
  Confidence,
  FieldStatus,
  HandoverExtractionResult,
} from "@/lib/types";

type ReviewStatus = HandoverExtractionResult["review"]["overallStatus"];
type RiskLevel = HandoverExtractionResult["review"]["riskLevel"];

export type StatusValue =
  | FieldStatus
  | ChecklistStatus
  | Confidence
  | ReviewStatus
  | RiskLevel;

export const statusLabels: Record<StatusValue, string> = {
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

const goodStatuses = new Set<StatusValue>(["filled", "complete", "ok", "low"]);

const warningStatuses = new Set<StatusValue>([
  "needs_review",
  "pending",
  "tbc",
  "requires_review",
  "medium",
  "high",
]);

const badStatuses = new Set<StatusValue>([
  "missing",
  "conflict",
  "critical_issue",
  "critical",
]);

export function getStatusLabel(value: StatusValue) {
  return statusLabels[value];
}

export function badgeClass(value: StatusValue) {
  if (goodStatuses.has(value)) {
    return "badge good";
  }

  if (warningStatuses.has(value)) {
    return "badge warn";
  }

  if (badStatuses.has(value)) {
    return "badge bad";
  }

  return "badge";
}

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function makeFileName(value: string) {
  const safeName = value
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  const date = new Date().toISOString().slice(0, 10);

  return `${safeName || "handover-checklist"}-${date}.html`;
}

export function downloadTextFile(
  fileName: string,
  content: string,
  mimeType: string,
) {
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
