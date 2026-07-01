"use client";

import { useState } from "react";
import type { ChecklistStatus, HandoverExtractionResult } from "@/lib/types";
import { badgeClass, getStatusLabel } from "@/lib/handoverUi";
import { groupChecklistItems } from "@/lib/checklistGroups";

const CHECKLIST_STATUSES: ChecklistStatus[] = [
  "complete", "pending", "tbc", "requires_review", "critical_issue", "not_applicable", "not_started",
];

const CAT: Record<string, { color: string; cellBg: string; cellBorder: string; rowBg: string; rowAlt: string }> = {
  "Project Planning":                  { color: "#2dd4bf", cellBg: "rgba(45,212,191,.22)",  cellBorder: "rgba(45,212,191,.50)",  rowBg: "rgba(45,212,191,.22)",  rowAlt: "rgba(45,212,191,.22)"  },
  "Communications":                    { color: "#22d3ee", cellBg: "rgba(34,211,238,.22)",  cellBorder: "rgba(34,211,238,.50)",  rowBg: "rgba(34,211,238,.22)",  rowAlt: "rgba(34,211,238,.22)"  },
  "Plant Area Info / Site Assessment": { color: "#38bdf8", cellBg: "rgba(56,189,248,.22)",  cellBorder: "rgba(56,189,248,.50)",  rowBg: "rgba(56,189,248,.22)",  rowAlt: "rgba(56,189,248,.22)"  },
  "Commissioning":                     { color: "#a78bfa", cellBg: "rgba(167,139,250,.22)", cellBorder: "rgba(167,139,250,.50)", rowBg: "rgba(167,139,250,.22)", rowAlt: "rgba(167,139,250,.22)" },
};
const FALLBACK = CAT["Project Planning"];

type Props = {
  result: HandoverExtractionResult;
  onUpdateItem: (itemLabel: string, patch: { suggestedStatus?: ChecklistStatus; comments?: string; remarks?: string }) => void;
};

export function ChecklistTable({ result, onUpdateItem }: Props) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function startEdit(label: string, field: "comments" | "remarks", current: string) {
    setEditingKey(`${label}:${field}`);
    setDraft(current);
  }

  function commitEdit(label: string, field: "comments" | "remarks") {
    const scrollY = window.scrollY;
    onUpdateItem(label, { [field]: draft });
    setEditingKey(null);
    requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "instant" }));
  }

  function autoResize(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    el.focus({ preventScroll: true });
  }

  function isEditing(label: string, field: "comments" | "remarks") {
    return editingKey === `${label}:${field}`;
  }

  const groups = groupChecklistItems(result);

  return (
    <div className="tableWrap" style={{ marginTop: 20 }}>
      <table>
        <thead>
          <tr>
            <th style={{ width: 130 }}>Category</th>
            <th>Item</th>
            <th>Status</th>
            <th>Comments</th>
            <th>Remarks</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(({ category, indices }) => {
            const c = CAT[category] ?? FALLBACK;
            return indices.map((index, pos) => {
              const item = result.checklistItems[index];
              return (
                <tr
                  key={`${item.itemLabel}-${index}`}
                  style={{ background: pos % 2 === 1 ? c.rowAlt : c.rowBg }}
                >
                  {pos === 0 && (
                    <td
                      rowSpan={indices.length}
                      className="categorySpanCell"
                      style={{
                        color: "rgba(255,255,255,.70)",
                        background: c.cellBg,
                        borderRight: `2px solid ${c.cellBorder}`,
                        boxShadow: `inset 3px 0 0 ${c.color}`,
                      }}
                    >
                      {category}
                    </td>
                  )}

                  <td>
                    <span className="itemLabel" style={{ color: "rgba(255,255,255,.80)" }}>
                      {item.itemLabel}
                    </span>
                  </td>

                  <td>
                    <select
                      className={`inlineSelect ${badgeClass(item.suggestedStatus)}`}
                      value={item.suggestedStatus}
                      onChange={(e) => onUpdateItem(item.itemLabel, { suggestedStatus: e.target.value as ChecklistStatus })}
                    >
                      {CHECKLIST_STATUSES.map((s) => (
                        <option key={s} value={s}>{getStatusLabel(s)}</option>
                      ))}
                    </select>
                  </td>

                  <td
                    className={!isEditing(item.itemLabel, "comments") ? "cellEditable" : undefined}
                    onClick={() => !isEditing(item.itemLabel, "comments") && startEdit(item.itemLabel, "comments", item.comments)}
                  >
                    {isEditing(item.itemLabel, "comments") ? (
                      <textarea
                        className="inlineTextarea"
                        ref={autoResize}
                        value={draft}
                        onChange={(e) => { setDraft(e.target.value); autoResize(e.target); }}
                        onBlur={() => commitEdit(item.itemLabel, "comments")}
                        onKeyDown={(e) => { if (e.key === "Escape") setEditingKey(null); }}
                      />
                    ) : (
                      <span className="cellEditableValue" style={{ color: "rgba(255,255,255,.70)" }}>
                        {item.comments || <span style={{ color: "rgba(255,255,255,.25)" }}>—</span>}
                        <span className="cellEditIcon">✎</span>
                      </span>
                    )}
                  </td>

                  <td
                    className={!isEditing(item.itemLabel, "remarks") ? "cellEditable" : undefined}
                    onClick={() => !isEditing(item.itemLabel, "remarks") && startEdit(item.itemLabel, "remarks", item.remarks)}
                  >
                    {isEditing(item.itemLabel, "remarks") ? (
                      <textarea
                        className="inlineTextarea"
                        ref={autoResize}
                        value={draft}
                        onChange={(e) => { setDraft(e.target.value); autoResize(e.target); }}
                        onBlur={() => commitEdit(item.itemLabel, "remarks")}
                        onKeyDown={(e) => { if (e.key === "Escape") setEditingKey(null); }}
                      />
                    ) : (
                      <span className="cellEditableValue" style={{ color: "rgba(255,255,255,.70)" }}>
                        {item.remarks || <span style={{ color: "rgba(255,255,255,.25)" }}>—</span>}
                        <span className="cellEditIcon">✎</span>
                      </span>
                    )}
                  </td>

                  <td className="evidence" style={{ color: "rgba(255,255,255,.55)" }}>
                    {item.evidenceText}
                  </td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
