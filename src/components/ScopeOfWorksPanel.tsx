"use client";

import type { ScopeOfWorksResult } from "@/lib/sowTypes";

type Props = {
  result: ScopeOfWorksResult | null;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
  canGenerate: boolean;
};

function SowSection({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="sowSection">
      <h3 className="sowSectionTitle">
        <span className="sowSectionNum">{num}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function SowList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="sowList">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

export function ScopeOfWorksPanel({ result, isGenerating, error, onGenerate, canGenerate }: Props) {
  return (
    <section className="panel wide">
      <div className="panelHeader">
        <div>
          <h2>Scope of Works</h2>
          <p className="subtle">AI-generated scope of works for the operations team.</p>
        </div>
        <button
          className="button"
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          style={{ flexShrink: 0 }}
        >
          {isGenerating ? "Generating…" : result ? "↺ Regenerate" : "✦ Generate SOW"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {isGenerating && !result && (
        <div className="uploading" style={{ padding: "32px 0", justifyContent: "center" }}>
          <span className="uploadSpinner" />
          Generating Scope of Works…
        </div>
      )}

      {!result && !isGenerating && (
        <div className="empty">
          <span className="emptyIcon">📋</span>
          Upload source documents then click Generate SOW.
        </div>
      )}

      {result && (
        <div className="sowDoc">
          {/* Scope flags summary */}
          <div className="sowFlags">
            {Object.entries({
              Removal:        result.scopeFlags.hasRemoval,
              Supply:         result.scopeFlags.hasSupply,
              "Prefab Skid":  result.scopeFlags.isPrefabSkid,
              "Install Only": result.scopeFlags.installOnly,
              Electrical:     result.scopeFlags.hasElectrical,
              Ancillaries:    result.scopeFlags.hasAncillaries,
              FAT:            result.scopeFlags.hasFat,
              Commissioning:  result.scopeFlags.hasCommissioning,
              Programme:      result.scopeFlags.hasProgramme,
              Delivery:       result.scopeFlags.hasDelivery,
            }).map(([label, active]) => (
              <span key={label} className={`sowFlag${active ? " sowFlag--on" : ""}`}>{label}</span>
            ))}
          </div>

          {/* Numbered sections */}
          {(() => {
            let n = 0;
            const f = result.scopeFlags;
            return (
              <>
                {/* Overview — always shown */}
                {result.overview && (
                  <SowSection num={++n} title="Overview">
                    {result.overview.split("\n\n").map((para, i) => (
                      <p key={i} className="sowPara">{para}</p>
                    ))}
                  </SowSection>
                )}

                {f.hasRemoval && result.removalItems.length > 0 && (
                  <SowSection num={++n} title="Decommissioning & Removal">
                    <p className="sowPara">The following existing plant and equipment will be decommissioned and removed from site:</p>
                    <SowList items={result.removalItems} />
                  </SowSection>
                )}

                {(f.hasSupply || f.installOnly) && result.supplySections.length > 0 && (
                  <SowSection num={++n} title={f.isPrefabSkid ? "Supply — Prefabricated Skid" : "Supply"}>
                    {result.supplySections.map((sec, i) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        {sec.subtitle && <p className="sowSubtitle">{sec.subtitle}</p>}
                        {sec.description && <p className="sowPara">{sec.description}</p>}
                        <SowList items={sec.items} />
                      </div>
                    ))}
                  </SowSection>
                )}

                {f.hasPreliminaryDrawings && (
                  <SowSection num={++n} title="Preliminary Drawings">
                    <p className="sowPara">General Arrangement (GA) and skid drawings will be prepared and submitted for client approval prior to commencement of manufacture.</p>
                  </SowSection>
                )}

                {f.hasFat && (
                  <SowSection num={++n} title="Factory Acceptance Testing (FAT)">
                    <p className="sowPara">Factory Acceptance Testing will be conducted at Automatic Heating's Epping facility prior to despatch. The client is invited to witness FAT. FAT does not include on-site commissioning.</p>
                  </SowSection>
                )}

                {(f.hasSupply || f.installOnly) && (result.installDescription || result.installItems.length > 0) && (
                  <SowSection num={++n} title="Installation">
                    {result.installDescription && <p className="sowPara">{result.installDescription}</p>}
                    <SowList items={result.installItems} />
                  </SowSection>
                )}

                {f.hasElectrical && result.electricalSections.length > 0 && (
                  <SowSection num={++n} title="Electrical Works">
                    {result.electricalSections.map((sec, i) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        {sec.subtitle && <p className="sowSubtitle">{sec.subtitle}</p>}
                        <SowList items={sec.items} />
                      </div>
                    ))}
                  </SowSection>
                )}

                {f.hasAncillaries && result.ancillaryItems.length > 0 && (
                  <SowSection num={++n} title="Mechanical Ancillaries">
                    <SowList items={result.ancillaryItems} />
                  </SowSection>
                )}

                {f.hasCommissioning && (result.commissioningDescription || result.commissioningItems.length > 0) && (
                  <SowSection num={++n} title="Commissioning">
                    {result.commissioningDescription && <p className="sowPara">{result.commissioningDescription}</p>}
                    <SowList items={result.commissioningItems} />
                  </SowSection>
                )}

                {f.hasProgramme && (
                  <SowSection num={++n} title="Programme & Site Management">
                    <p className="sowPara">Works will be programmed to minimise disruption to site operations. A detailed programme will be agreed with the client prior to commencement.</p>
                  </SowSection>
                )}

                {f.hasDelivery && result.deliveryNote && (
                  <SowSection num={++n} title="Delivery">
                    <p className="sowPara">{result.deliveryNote}</p>
                  </SowSection>
                )}

                {result.exclusions.length > 0 && (
                  <SowSection num={++n} title="Exclusions">
                    <p className="sowPara">The following items are specifically excluded from this Scope of Works:</p>
                    <SowList items={result.exclusions} />
                  </SowSection>
                )}
              </>
            );
          })()}

          {result.footerNote && (
            <p className="sowFooter">{result.footerNote}</p>
          )}
        </div>
      )}
    </section>
  );
}
