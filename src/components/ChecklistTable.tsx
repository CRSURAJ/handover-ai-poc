import type { HandoverExtractionResult } from "@/lib/types";
import { badgeClass, getStatusLabel } from "@/lib/handoverUi";

type ChecklistTableProps = {
  result: HandoverExtractionResult;
};

const CAT: Record<string, { color: string; cellBg: string; cellBorder: string; rowBg: string; rowAlt: string }> = {
  "Project Planning":                  { color: "#2dd4bf", cellBg: "rgba(45,212,191,.22)",  cellBorder: "rgba(45,212,191,.50)",  rowBg: "rgba(45,212,191,.22)",  rowAlt: "rgba(45,212,191,.22)"  },
  "Communications":                    { color: "#22d3ee", cellBg: "rgba(34,211,238,.22)",  cellBorder: "rgba(34,211,238,.50)",  rowBg: "rgba(34,211,238,.22)",  rowAlt: "rgba(34,211,238,.22)"  },
  "Plant Area Info / Site Assessment": { color: "#38bdf8", cellBg: "rgba(56,189,248,.22)",  cellBorder: "rgba(56,189,248,.50)",  rowBg: "rgba(56,189,248,.22)",  rowAlt: "rgba(56,189,248,.22)"  },
  "Commissioning":                     { color: "#a78bfa", cellBg: "rgba(167,139,250,.22)", cellBorder: "rgba(167,139,250,.50)", rowBg: "rgba(167,139,250,.22)", rowAlt: "rgba(167,139,250,.22)" },
};
const FALLBACK = CAT["Project Planning"];


export function ChecklistTable({ result }: ChecklistTableProps) {
  const CATEGORY_ORDER = [
    "Project Planning",
    "Plant Area Info / Site Assessment",
    "Commissioning",
    "Communications",
  ];

  const groupMap = new Map<string, number[]>();
  result.checklistItems.forEach((item, i) => {
    const existing = groupMap.get(item.category);
    if (existing) existing.push(i);
    else groupMap.set(item.category, [i]);
  });

  const groups = CATEGORY_ORDER
    .filter((cat) => groupMap.has(cat))
    .map((cat) => ({ category: cat, indices: groupMap.get(cat)! }));

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
                    <td><span className="itemLabel" style={{ color: "rgba(255,255,255,.80)" }}>{item.itemLabel}</span></td>
                    <td>
                      <span className={badgeClass(item.suggestedStatus)}>
                        {getStatusLabel(item.suggestedStatus)}
                      </span>
                    </td>
                    <td style={{ color: "rgba(255,255,255,.70)" }}>{item.comments || <span style={{ color: "rgba(255,255,255,.25)" }}>—</span>}</td>
                    <td style={{ color: "rgba(255,255,255,.70)" }}>{item.remarks  || <span style={{ color: "rgba(255,255,255,.25)" }}>—</span>}</td>
                    <td className="evidence" style={{ color: "rgba(255,255,255,.55)" }}>{item.evidenceText}</td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
  );
}
