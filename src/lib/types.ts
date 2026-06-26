export type FieldStatus = "filled" | "missing" | "needs_review" | "conflict";
export type Confidence = "high" | "medium" | "low";

export type ChecklistStatus =
  | "not_started"
  | "complete"
  | "pending"
  | "tbc"
  | "requires_review"
  | "critical_issue"
  | "not_applicable";

export type HeaderFieldExtraction = {
  fieldKey: string;
  fieldLabel: string;
  extractedValue: string | null;
  status: FieldStatus;
  confidence: Confidence;
  sourceName: string;
  evidenceText: string;
  reasoningNote: string;
};

export type ChecklistItemExtraction = {
  category: string;
  itemLabel: string;
  suggestedStatus: ChecklistStatus;
  comments: string;
  remarks: string;
  handoverMeetingNotes: string;
  confidence: Confidence;
  sourceName: string;
  evidenceText: string;
  reasoningNote: string;
};

export type HandoverExtractionResult = {
  templateName: string;
  templateRevision: string;
  extractionMode: "ai";
  headerFields: HeaderFieldExtraction[];
  checklistItems: ChecklistItemExtraction[];
  review: {
    overallStatus: "ok" | "requires_review" | "critical";
    riskLevel: "low" | "medium" | "high" | "critical";
    executiveSummary: string;
    tbcItems: string[];
    missingItems: string[];
    riskFlags: string[];
    suggestedActions: string[];
    opsSummary: string;
  };
};
