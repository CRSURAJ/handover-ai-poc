import type { HandoverExtractionResult } from "@/lib/types";
import { badgeClass, statusLabels } from "@/lib/handoverUi";

type HeaderFieldsTableProps = {
  result: HandoverExtractionResult;
};

export function HeaderFieldsTable({ result }: HeaderFieldsTableProps) {
  return (
    <section className="panel wide">
      <div className="panelHeader">
        <div>
          <h2>3. Header Fields</h2>
          <p>Each extracted value keeps evidence and confidence.</p>
        </div>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Extracted Value</th>
              <th>Status</th>
              <th>Confidence</th>
              <th>Evidence</th>
            </tr>
          </thead>

          <tbody>
            {result.headerFields.map((field) => (
              <tr key={field.fieldKey}>
                <td>
                  <strong>{field.fieldLabel}</strong>
                </td>

                <td>
                  {field.extractedValue || (
                    <span className="muted">Not found</span>
                  )}
                </td>

                <td>
                  <span className={badgeClass(field.status)}>
                    {statusLabels[field.status] || field.status}
                  </span>
                </td>

                <td>{field.confidence}</td>

                <td className="evidence">{field.evidenceText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
