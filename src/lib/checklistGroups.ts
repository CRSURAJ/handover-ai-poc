import type { HandoverExtractionResult } from "@/lib/types";

export const CHECKLIST_CATEGORY_ORDER = [
  "Project Planning",
  "Plant Area Info / Site Assessment",
  "Commissioning",
  "Communications",
];

export type ChecklistGroup = { category: string; indices: number[] };

export function groupChecklistItems(
  result: HandoverExtractionResult,
): ChecklistGroup[] {
  const groupMap = new Map<string, number[]>();
  result.checklistItems.forEach((item, i) => {
    const existing = groupMap.get(item.category);
    if (existing) existing.push(i);
    else groupMap.set(item.category, [i]);
  });

  return CHECKLIST_CATEGORY_ORDER.filter((cat) => groupMap.has(cat)).map(
    (cat) => ({ category: cat, indices: groupMap.get(cat)! }),
  );
}
