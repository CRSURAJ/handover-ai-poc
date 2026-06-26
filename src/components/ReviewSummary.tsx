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
          <p className="subtle">AI assists — humans approve. Review before accepting.</p>
        </div>
        <div className="panelNum">2</div>
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

          <div>
            <h3>Executive Summary</h3>
            <p className="subtle">{result.review.executiveSummary}</p>
          </div>

          <div>
            <h3>TBC / Review Items</h3>
            {result.review.tbcItems.length === 0 ? (
              <p className="muted">None found.</p>
            ) : (
              <ul>
                {result.review.tbcItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3>Suggested Actions</h3>
            {result.review.suggestedActions.length === 0 ? (
              <p className="muted">None found.</p>
            ) : (
              <ul>
                {result.review.suggestedActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
