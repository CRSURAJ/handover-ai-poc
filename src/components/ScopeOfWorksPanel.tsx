"use client";

import { useEffect, useRef, useState } from "react";
import type { ScopeOfWorksResult, ScopeFlags } from "@/lib/sowTypes";
import type { SowQuestion } from "@/lib/sowQuestionTypes";

type Props = {
  result: ScopeOfWorksResult | null;
  isGenerating: boolean;
  isQuestioning: boolean;
  error: string | null;
  questions: SowQuestion[] | null;
  questionsError: string | null;
  onGenerate: () => void;
  onConfirmQuestions: (answers: Record<string, string>) => void;
  canGenerate: boolean;
  onUpdate: (result: ScopeOfWorksResult) => void;
};

const FLAG_MAP: Array<[string, keyof ScopeFlags]> = [
  ["Removal",       "hasRemoval"],
  ["Supply",        "hasSupply"],
  ["Prefab Skid",   "isPrefabSkid"],
  ["Install Only",  "installOnly"],
  ["Electrical",    "hasElectrical"],
  ["Ancillaries",   "hasAncillaries"],
  ["FAT",           "hasFat"],
  ["Commissioning", "hasCommissioning"],
  ["Programme",     "hasProgramme"],
  ["Delivery",      "hasDelivery"],
];

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

function EditableText({
  value,
  onChange,
  placeholder = "Click to add text…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [editing]);

  const save = () => {
    setEditing(false);
    if (draft.trim() !== value) onChange(draft.trim());
  };

  if (editing) {
    return (
      <textarea
        ref={ref}
        className="sowEditTextarea"
        value={draft}
        onChange={e => {
          setDraft(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = e.target.scrollHeight + "px";
        }}
        onBlur={save}
        onKeyDown={e => { if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
      />
    );
  }

  return (
    <p
      className={`sowPara sowEditable${!value ? " sowEditable--empty" : ""}`}
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
    >
      {value || placeholder}
    </p>
  );
}

function EditableList({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const save = (idx: number) => {
    const trimmed = draft.trim();
    if (trimmed) {
      const next = [...items];
      next[idx] = trimmed;
      onChange(next);
    } else {
      onChange(items.filter((_, i) => i !== idx));
    }
    setEditingIdx(null);
  };

  const addItem = () => {
    const next = [...items, ""];
    onChange(next);
    setEditingIdx(next.length - 1);
    setDraft("");
  };

  const deleteItem = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (editingIdx === idx) setEditingIdx(null);
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <ul className="sowList sowListEditable">
      {items.map((item, i) => (
        <li key={i} className="sowListItem">
          {editingIdx === i ? (
            <input
              type="text"
              className="sowEditInput"
              value={draft}
              autoFocus
              onChange={e => setDraft(e.target.value)}
              onBlur={() => save(i)}
              onKeyDown={e => {
                if (e.key === "Enter") save(i);
                if (e.key === "Escape") setEditingIdx(null);
              }}
            />
          ) : (
            <>
              <span
                className="sowItemText"
                onClick={() => { setDraft(item); setEditingIdx(i); }}
                title="Click to edit"
              >
                {item}
              </span>
              <button
                className="sowDeleteBtn"
                onClick={e => deleteItem(e, i)}
                title="Remove"
              >×</button>
            </>
          )}
        </li>
      ))}
      <li className="sowAddItem">
        <button className="sowAddBtn" onClick={addItem}>+ Add item</button>
      </li>
    </ul>
  );
}

function EditableSubtitle({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  const save = () => {
    setEditing(false);
    if (draft.trim() !== value) onChange(draft.trim());
  };

  if (editing) {
    return (
      <input
        type="text"
        className="sowEditInput sowSubtitle"
        value={draft}
        autoFocus
        onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={e => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
      />
    );
  }

  return (
    <p
      className={`sowSubtitle sowEditable${!value ? " sowEditable--empty" : ""}`}
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
    >
      {value || "Click to add subtitle…"}
    </p>
  );
}

const SUPPLY_LOOSE_HIDDEN = new Set(["has_removal", "has_ancillaries", "has_programme"]);

function SowQuestionsForm({
  questions,
  error,
  onConfirm,
  onSkip,
}: {
  questions: SowQuestion[];
  error: string | null;
  onConfirm: (answers: Record<string, string>) => void;
  onSkip: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => Object.fromEntries(questions.map(q => [q.id, q.defaultValue])),
  );

  const projectType = answers["project_type"] ?? "";
  const isSupplyLoose = projectType === "Supply Loose";

  const handleSetAnswer = (id: string, value: string) => {
    setAnswers(prev => {
      const next = { ...prev, [id]: value };
      if (id === "project_type" && value === "Supply Loose") {
        next["has_removal"] = "false";
        next["has_ancillaries"] = "false";
        next["has_programme"] = "false";
        if (next["electrical_scope"] === "Installation of Control Panel") {
          next["electrical_scope"] = "No Control Panel needed";
        }
      }
      return next;
    });
  };

  const shouldShow = (q: SowQuestion) =>
    !(isSupplyLoose && SUPPLY_LOOSE_HIDDEN.has(q.id));

  const getChoices = (q: SowQuestion) =>
    q.id === "electrical_scope" && isSupplyLoose
      ? q.choices.filter(c => c !== "Installation of Control Panel")
      : q.choices;

  const visibleQuestions = questions.filter(shouldShow);

  return (
    <div className="sowQuestionsForm">
      <div className="sowQuestionsHeader">
        <p className="sowQuestionsTitle">Confirm project details before generating</p>
        <p className="sowQuestionsSubtitle">
          Pre-filled from your source documents — correct anything that&apos;s wrong.
          {isSupplyLoose && " Installation and removal questions are hidden — Supply Loose is supply only."}
        </p>
      </div>

      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}

      {visibleQuestions.map((q, i) => (
        <div key={q.id} className="sowQuestion">
          <div className="sowQuestionLabel">
            <span className="sowQuestionNum">{i + 1}</span>
            <div>
              <p className="sowQuestionText">{q.question}</p>
              {q.hint && <p className="sowQuestionHint">{q.hint}</p>}
            </div>
          </div>

          {q.type === "boolean" && (
            <div className="sowBoolBtns">
              {(["true", "false"] as const).map(val => (
                <button
                  key={val}
                  className={`sowBoolBtn${answers[q.id] === val ? " sowBoolBtn--active" : ""}`}
                  onClick={() => handleSetAnswer(q.id, val)}
                >
                  {val === "true" ? "Yes" : "No"}
                </button>
              ))}
            </div>
          )}

          {q.type === "text" && (
            <input
              type="text"
              className="sowQuestionInput"
              value={answers[q.id] ?? ""}
              placeholder="Type here…"
              onChange={e => handleSetAnswer(q.id, e.target.value)}
            />
          )}

          {q.type === "choice" && (
            <div className="sowChoiceBtns">
              {getChoices(q).map(choice => (
                <button
                  key={choice}
                  className={`sowChoiceBtn${answers[q.id] === choice ? " sowChoiceBtn--active" : ""}`}
                  onClick={() => handleSetAnswer(q.id, choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
          )}

          {q.type === "date" && (
            <div className="sowDatePicker">
              <input
                type="date"
                className="sowDateInput"
                value={answers[q.id] === "TBC" ? "" : (answers[q.id] ?? "")}
                disabled={answers[q.id] === "TBC"}
                onChange={e => handleSetAnswer(q.id, e.target.value)}
              />
              <button
                className={`sowTbcBtn${answers[q.id] === "TBC" ? " sowTbcBtn--active" : ""}`}
                onClick={() => handleSetAnswer(q.id, answers[q.id] === "TBC" ? "" : "TBC")}
              >
                TBC
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="sowQuestionsActions">
        <button className="button" onClick={() => onConfirm(answers)}>
          ✦ Confirm &amp; Generate
        </button>
        <button className="sowSkipBtn" onClick={onSkip}>
          Skip questions
        </button>
      </div>
    </div>
  );
}

export function ScopeOfWorksPanel({
  result, isGenerating, isQuestioning, error,
  questions, questionsError,
  onGenerate, onConfirmQuestions, canGenerate, onUpdate,
}: Props) {
  const isBusy = isGenerating || isQuestioning;

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
          disabled={!canGenerate || isBusy}
          style={{ flexShrink: 0 }}
        >
          {isQuestioning ? "Loading…" : isGenerating ? "Generating…" : result ? "↺ Regenerate" : "✦ Generate SOW"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {isQuestioning && (
        <div className="uploading" style={{ padding: "32px 0", justifyContent: "center" }}>
          <span className="uploadSpinner" />
          Preparing questions…
        </div>
      )}

      {questions !== null && !isQuestioning && (
        <SowQuestionsForm
          questions={questions}
          error={questionsError}
          onConfirm={onConfirmQuestions}
          onSkip={() => onConfirmQuestions({})}
        />
      )}

      {isGenerating && !result && (
        <div className="uploading" style={{ padding: "32px 0", justifyContent: "center" }}>
          <span className="uploadSpinner" />
          Generating Scope of Works…
        </div>
      )}

      {!result && !isGenerating && !isQuestioning && questions === null && (
        <div className="empty">
          <span className="emptyIcon">📋</span>
          Upload source documents then click Generate SOW.
        </div>
      )}

      {result && (
        <div className="sowDoc">
          {/* Scope flags — click to toggle sections */}
          <div className="sowFlags">
            {FLAG_MAP.map(([label, key]) => (
              <button
                key={label}
                className={`sowFlag sowFlagBtn${result.scopeFlags[key] ? " sowFlag--on" : ""}`}
                onClick={() => onUpdate({
                  ...result,
                  scopeFlags: { ...result.scopeFlags, [key]: !result.scopeFlags[key] },
                })}
                title={result.scopeFlags[key] ? "Click to hide section" : "Click to show section"}
              >
                {label}
              </button>
            ))}
          </div>

          {(() => {
            let n = 0;
            const f = result.scopeFlags;
            return (
              <>
                {result.overview !== undefined && (
                  <SowSection num={++n} title="Overview">
                    {result.overview.split("\n\n").map((para, i, arr) => (
                      <EditableText
                        key={i}
                        value={para}
                        onChange={updated => {
                          const parts = result.overview.split("\n\n");
                          parts[i] = updated;
                          onUpdate({ ...result, overview: parts.join("\n\n") });
                        }}
                      />
                    ))}
                  </SowSection>
                )}

                {f.hasRemoval && (
                  <SowSection num={++n} title="Decommissioning & Removal">
                    <p className="sowPara">The following existing plant and equipment will be decommissioned and removed from site:</p>
                    <EditableList
                      items={result.removalItems}
                      onChange={items => onUpdate({ ...result, removalItems: items })}
                    />
                  </SowSection>
                )}

                {(f.hasSupply || f.installOnly) && (
                  <SowSection num={++n} title={f.isPrefabSkid ? "Supply — Prefabricated Skid" : "Supply"}>
                    {result.supplySections.map((sec, i) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <EditableSubtitle
                          value={sec.subtitle}
                          onChange={v => {
                            const next = [...result.supplySections];
                            next[i] = { ...sec, subtitle: v };
                            onUpdate({ ...result, supplySections: next });
                          }}
                        />
                        <EditableText
                          value={sec.description}
                          placeholder="Click to add description…"
                          onChange={v => {
                            const next = [...result.supplySections];
                            next[i] = { ...sec, description: v };
                            onUpdate({ ...result, supplySections: next });
                          }}
                        />
                        <EditableList
                          items={sec.items}
                          onChange={items => {
                            const next = [...result.supplySections];
                            next[i] = { ...sec, items };
                            onUpdate({ ...result, supplySections: next });
                          }}
                        />
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
                    <p className="sowPara">Factory Acceptance Testing will be conducted at Automatic Heating&apos;s Epping facility prior to despatch. The client is invited to witness FAT. FAT does not include on-site commissioning.</p>
                  </SowSection>
                )}

                {f.hasSupply && !f.hasCommissioning && !f.installOnly && (
                  <SowSection num={++n} title="Installation">
                    <div className="sowSupplyOnlyNotice">
                      Supply only — installation is not in scope for this job.
                    </div>
                  </SowSection>
                )}

                {(f.hasCommissioning || f.installOnly) && (
                  <SowSection num={++n} title="Installation">
                    <EditableText
                      value={result.installDescription}
                      placeholder="Click to add installation description…"
                      onChange={v => onUpdate({ ...result, installDescription: v })}
                    />
                    <EditableList
                      items={result.installItems}
                      onChange={items => onUpdate({ ...result, installItems: items })}
                    />
                  </SowSection>
                )}

                {f.hasElectrical && (
                  <SowSection num={++n} title="Electrical Works">
                    {result.electricalSections.map((sec, i) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <EditableSubtitle
                          value={sec.subtitle}
                          onChange={v => {
                            const next = [...result.electricalSections];
                            next[i] = { ...sec, subtitle: v };
                            onUpdate({ ...result, electricalSections: next });
                          }}
                        />
                        <EditableList
                          items={sec.items}
                          onChange={items => {
                            const next = [...result.electricalSections];
                            next[i] = { ...sec, items };
                            onUpdate({ ...result, electricalSections: next });
                          }}
                        />
                      </div>
                    ))}
                  </SowSection>
                )}

                {f.hasAncillaries && (
                  <SowSection num={++n} title="Mechanical Ancillaries">
                    <EditableList
                      items={result.ancillaryItems}
                      onChange={items => onUpdate({ ...result, ancillaryItems: items })}
                    />
                  </SowSection>
                )}

                {f.hasCommissioning && (
                  <SowSection num={++n} title="Commissioning">
                    <EditableText
                      value={result.commissioningDescription}
                      placeholder="Click to add commissioning description…"
                      onChange={v => onUpdate({ ...result, commissioningDescription: v })}
                    />
                    <EditableList
                      items={result.commissioningItems}
                      onChange={items => onUpdate({ ...result, commissioningItems: items })}
                    />
                  </SowSection>
                )}

                {f.hasProgramme && (
                  <SowSection num={++n} title="Programme & Site Management">
                    <p className="sowPara">Works will be programmed to minimise disruption to site operations. A detailed programme will be agreed with the client prior to commencement.</p>
                  </SowSection>
                )}

                {f.hasDelivery && (
                  <SowSection num={++n} title="Delivery">
                    <EditableText
                      value={result.deliveryNote}
                      placeholder="Click to add delivery note…"
                      onChange={v => onUpdate({ ...result, deliveryNote: v })}
                    />
                  </SowSection>
                )}

                <SowSection num={++n} title="Exclusions">
                  <p className="sowPara">The following items are specifically excluded from this Scope of Works:</p>
                  <EditableList
                    items={result.exclusions}
                    onChange={items => onUpdate({ ...result, exclusions: items })}
                  />
                </SowSection>
              </>
            );
          })()}

          {result.footerNote !== undefined && (
            <div className="sowFooter">
              <EditableText
                value={result.footerNote}
                placeholder="Click to add footer note…"
                onChange={v => onUpdate({ ...result, footerNote: v })}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
