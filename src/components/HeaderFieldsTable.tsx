import type { HandoverExtractionResult, Confidence } from "@/lib/types";
import { badgeClass, getStatusLabel } from "@/lib/handoverUi";

type HeaderFieldsTableProps = {
  result: HandoverExtractionResult;
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

export function HeaderFieldsTable({ result }: HeaderFieldsTableProps) {
  return (
    <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Description</th>
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

                <td>
                  {field.extractedValue || (
                    <span className="muted">Not found</span>
                  )}
                </td>

                <td>
                  <span className={badgeClass(field.status)}>
                    {getStatusLabel(field.status)}
                  </span>
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
