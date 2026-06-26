import type { HandoverExtractionResult } from "@/lib/types";
import type { ChecklistProgress } from "@/lib/handoverProgress";
import { badgeClass, statusLabels } from "@/lib/handoverUi";


type ReviewSummaryProps = {
  result: HandoverExtractionResult | null;
  progress: ChecklistProgress | null;
};

export function ReviewSummary({ result, progress }: ReviewSummaryProps) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2>2. Review Summary</h2>
          <p>
            AI should assist, not silently approve. These results are for human
            review.
          </p>
        </div>
      </div>

      {!result ? (
        <div className="empty">
          Run extraction to see risk, missing information, and Ops summary.
        </div>
      ) : (
        <div className="stack">
          <div className="summaryCards">
            <div className="metric">
              <span>Status</span>
              <strong className={badgeClass(result.review.overallStatus)}>
                {statusLabels[result.review.overallStatus] ||
                  result.review.overallStatus}
              </strong>
            </div>

            <div className="metric">
              <span>Risk</span>
              <strong className={badgeClass(result.review.riskLevel)}>
                {result.review.riskLevel.toUpperCase()}
              </strong>
            </div>

            <div className="metric">
              <span>Progress</span>
              <strong>
                {progress?.complete}/{progress?.total}
              </strong>
            </div>
          </div>

          <div>
            <h3>Executive Summary</h3>
            <p>{result.review.executiveSummary}</p>
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
