import type { HandoverExtractionResult } from "@/lib/types";
import type { ChecklistProgress } from "@/lib/handoverProgress";
import { badgeClass, getStatusLabel } from "@/lib/handoverUi";

type ReviewSummaryProps = {
  result: HandoverExtractionResult | null;
  progress: ChecklistProgress | null;
};

export function ReviewSummary({ result, progress }: ReviewSummaryProps) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2>Review Summary</h2>
        </div>
      </div>

      {!result ? (
        <div className="empty">
          <span className="emptyIcon">🔍</span>
          Run extraction to see risk assessment, missing information, and Ops summary.
        </div>
      ) : (
        <div className="stack">
          <div className="summaryCards">
            <div className="metric">
              <span>Overall Status</span>
              <strong>
                <span className={badgeClass(result.review.overallStatus)}>
                  {getStatusLabel(result.review.overallStatus)}
                </span>
              </strong>
            </div>

            <div className="metric">
              <span>Risk Level</span>
              <strong>
                <span className={badgeClass(result.review.riskLevel)}>
                  {result.review.riskLevel.toUpperCase()}
                </span>
              </strong>
            </div>

            <div className="metric">
              <span>Progress</span>
              <strong>
                {progress?.complete ?? 0} / {progress?.total ?? 0}
              </strong>
              <div className="progressWrap">
                <div
                  className="progressBar"
                  style={{ width: `${progress?.percent ?? 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>TBC / Review Items</th>
                  <th>Suggested Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "top" }}>
                    {result.review.tbcItems.length === 0 ? (
                      <span className="muted">None found.</span>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {result.review.tbcItems.map((item) => (
                          <li key={item} style={{ marginBottom: 8, fontSize: 15 }}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td style={{ verticalAlign: "top" }}>
                    {result.review.suggestedActions.length === 0 ? (
                      <span className="muted">None found.</span>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {result.review.suggestedActions.map((action) => (
                          <li key={action} style={{ marginBottom: 8, fontSize: 15 }}>{action}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
