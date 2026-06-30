"use client";

import { useState } from "react";
import type { Confidence, FieldStatus, HandoverExtractionResult } from "@/lib/types";
import { badgeClass, getStatusLabel } from "@/lib/handoverUi";

const FIELD_STATUSES: FieldStatus[] = ["filled", "missing", "needs_review", "conflict"];

type Props = {
  result: HandoverExtractionResult;
  onUpdateField: (fieldKey: string, patch: { extractedValue?: string | null; status?: FieldStatus }) => void;
};

function ConfidencePips({ level }: { level: Confidence }) {
  const filled = level === "high" ? 3 : level === "medium" ? 2 : 1;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span className="confPips">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`confPip ${i <= filled ? `on ${level}` : ""}`} />
        ))}
      </span>
      <span className="confLabel">{level}</span>
    </span>
  );
}

export function HeaderFieldsTable({ result, onUpdateField }: Props) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function startEdit(fieldKey: string, current: string | null) {
    setEditingKey(fieldKey);
    setDraft(current ?? "");
  }

  function commitEdit(fieldKey: string) {
    const scrollY = window.scrollY;
    onUpdateField(fieldKey, { extractedValue: draft.trim() || null });
    setEditingKey(null);
    requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "instant" }));
  }

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
            <th>Status</th>
            <th>Confidence</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {result.headerFields.map((field) => (
            <tr key={field.fieldKey}>
              <td>
                <span className="itemLabel">{field.fieldLabel}</span>
              </td>

              <td
                className={editingKey !== field.fieldKey ? "cellEditable" : undefined}
                onClick={() => editingKey !== field.fieldKey && startEdit(field.fieldKey, field.extractedValue)}
              >
                {editingKey === field.fieldKey ? (
                  <input
                    className="inlineInput"
                    ref={(el) => el?.focus({ preventScroll: true })}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commitEdit(field.fieldKey)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); commitEdit(field.fieldKey); }
                      if (e.key === "Escape") setEditingKey(null);
                    }}
                  />
                ) : (
                  <span className="cellEditableValue">
                    {field.extractedValue || <span className="muted">Not found</span>}
                    <span className="cellEditIcon">✎</span>
                  </span>
                )}
              </td>

              <td>
                <select
                  className={`inlineSelect ${badgeClass(field.status)}`}
                  value={field.status}
                  onChange={(e) => onUpdateField(field.fieldKey, { status: e.target.value as FieldStatus })}
                >
                  {FIELD_STATUSES.map((s) => (
                    <option key={s} value={s}>{getStatusLabel(s)}</option>
                  ))}
                </select>
              </td>

              <td>
                <ConfidencePips level={field.confidence} />
              </td>

              <td className="evidence">{field.evidenceText}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
