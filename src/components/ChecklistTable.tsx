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
          <h2>Autofilled Checklist</h2>
          <p className="subtle">
            Review AI suggestions — save, approve, or export once verified.
          </p>
        </div>
        <div className="panelNum">4</div>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Item</th>
              <th>Status</th>
              <th>Comments</th>
              <th>Remarks</th>
              <th>Evidence</th>
            </tr>
          </thead>

          <tbody>
            {result.checklistItems.map((item, index) => (
              <tr key={`${item.category}-${item.itemLabel}-${index}`}>
                <td>
                  <span className="categoryCell">{item.category}</span>
                </td>

                <td>
                  <span className="itemLabel">{item.itemLabel}</span>
                  {criticalItemLabels.has(item.itemLabel) && (
                    <span className="criticalBadge">CRITICAL</span>
                  )}
                </td>

                <td>
                  <span className={badgeClass(item.suggestedStatus)}>
                    {getStatusLabel(item.suggestedStatus)}
                  </span>
                </td>

                <td>
                  {item.comments || (
                    <span className="muted">—</span>
                  )}
                </td>

                <td>{item.remarks || <span className="muted">—</span>}</td>

                <td className="evidence">{item.evidenceText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
