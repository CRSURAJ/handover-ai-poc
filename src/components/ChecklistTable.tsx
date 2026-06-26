import { CHECKLIST_ITEMS } from "@/lib/template";
import type { HandoverExtractionResult } from "@/lib/types";
import { badgeClass, getStatusLabel } from "@/lib/handoverUi";

type ChecklistTableProps = {
  result: HandoverExtractionResult;
};

const criticalItemLabels = new Set<string>(
  CHECKLIST_ITEMS.filter((i) => i.critical).map((i) => i.itemLabel),
);

export function ChecklistTable({ result }: ChecklistTableProps) {
  return (
    <section className="panel wide">
      <div className="panelHeader">
        <div>
          <h2>4. Autofilled Checklist</h2>
          <p>
            This is the checklist table you can later save, approve, export, or
            connect to your main app.
          </p>
        </div>
      </div>

      <div className="tableWrap">
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

          <tbody>
            {result.checklistItems.map((item, index) => (
              <tr key={`${item.category}-${item.itemLabel}-${index}`}>
                <td>{item.category}</td>

                <td>
                  <strong>{item.itemLabel}</strong>
                  {criticalItemLabels.has(item.itemLabel) && (
                    <span
                      className="badge bad"
                      style={{ marginLeft: 8, fontSize: 10, verticalAlign: "middle" }}
                    >
                      CRITICAL
                    </span>
                  )}
                </td>

                <td>
                  <span className={badgeClass(item.suggestedStatus)}>
                    {getStatusLabel(item.suggestedStatus)}
                  </span>
                </td>

                <td>
                  {item.comments || (
                    <span className="muted">No comment extracted</span>
                  )}
                </td>

                <td>{item.remarks}</td>

                <td className="evidence">{item.evidenceText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
