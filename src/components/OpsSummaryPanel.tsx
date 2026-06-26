import type { HandoverExtractionResult } from "@/lib/types";

type OpsSummaryPanelProps = {
  result: HandoverExtractionResult;
};

export function OpsSummaryPanel({ result }: OpsSummaryPanelProps) {
  return (
    <section className="panel wide">
      <div className="panelHeader">
        <div>
          <h2>5. Ops Summary</h2>
          <p>Short operational handover summary generated from the source pack.</p>
        </div>
      </div>

      <div className="opsSummary">{result.review.opsSummary}</div>

      <div className="twoColumns">
        <div>
          <h3>Missing Information</h3>
          {result.review.missingItems.length === 0 ? (
            <p className="muted">None found.</p>
          ) : (
            <ul>
              {result.review.missingItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3>Risk Flags</h3>
          {result.review.riskFlags.length === 0 ? (
            <p className="muted">None found.</p>
          ) : (
            <ul>
              {result.review.riskFlags.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
