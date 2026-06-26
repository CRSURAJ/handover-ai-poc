export const statusLabels: Record<string, string> = {
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

export function badgeClass(value: string) {
  if (["filled", "complete", "ok", "low"].includes(value)) {
    return "badge good";
  }

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
