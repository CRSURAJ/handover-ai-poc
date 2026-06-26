import type { HandoverExtractionResult } from "@/lib/types";
import { badgeClass, statusLabels } from "@/lib/handoverUi";

type ChecklistTableProps = {
  result: HandoverExtractionResult;
};

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
            {result.checklistItems.map((item) => (
              <tr key={`${item.category}-${item.itemLabel}`}>
                <td>{item.category}</td>

                <td>
                  <strong>{item.itemLabel}</strong>
                </td>

                <td>
                  <span className={badgeClass(item.suggestedStatus)}>
                    {statusLabels[item.suggestedStatus] ||
                      item.suggestedStatus}
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
