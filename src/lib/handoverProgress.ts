import type { HandoverExtractionResult } from "@/lib/types";

export type ChecklistProgress = {
  total: number;
  complete: number;
  percent: number;
};

export function getHandoverProgress(
  result: HandoverExtractionResult | null,
): ChecklistProgress | null {
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
}
