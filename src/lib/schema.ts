import {
  CHECKLIST_ITEMS,
  HEADER_FIELDS,
  TEMPLATE_NAME,
  TEMPLATE_REVISION,
} from "./template";

const fieldStatusValues = ["filled", "missing", "needs_review", "conflict"];

const confidenceValues = ["high", "medium", "low"];

const checklistStatusValues = [
  "not_started",
  "complete",
  "pending",
  "tbc",
  "requires_review",
  "critical_issue",
  "not_applicable",
];

const overallStatusValues = ["ok", "requires_review", "critical"];

const riskLevelValues = ["low", "medium", "high", "critical"];

const stringArraySchema = {
  type: "array",
  items: { type: "string" },
} as const;

const headerFieldSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "fieldKey",
    "fieldLabel",
    "extractedValue",
    "status",
    "confidence",
    "sourceName",
    "evidenceText",
    "reasoningNote",
  ],
  properties: {
    fieldKey: { type: "string" },
    fieldLabel: { type: "string" },
    extractedValue: { type: ["string", "null"] },
    status: { enum: fieldStatusValues },
    confidence: { enum: confidenceValues },
    sourceName: { type: "string" },
    evidenceText: { type: "string" },
    reasoningNote: { type: "string" },
  },
} as const;

const checklistItemSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "category",
    "itemLabel",
    "suggestedStatus",
    "comments",
    "remarks",
    "handoverMeetingNotes",
    "confidence",
    "sourceName",
    "evidenceText",
    "reasoningNote",
  ],
  properties: {
    category: { type: "string" },
    itemLabel: { type: "string" },
    suggestedStatus: { enum: checklistStatusValues },
    comments: { type: "string" },
    remarks: { type: "string" },
    handoverMeetingNotes: { type: "string" },
    confidence: { enum: confidenceValues },
    sourceName: { type: "string" },
    evidenceText: { type: "string" },
    reasoningNote: { type: "string" },
  },
} as const;

const reviewSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "overallStatus",
    "riskLevel",
    "executiveSummary",
    "tbcItems",
    "missingItems",
    "riskFlags",
    "suggestedActions",
    "opsSummary",
  ],
  properties: {
    overallStatus: { enum: overallStatusValues },
    riskLevel: { enum: riskLevelValues },
    executiveSummary: { type: "string" },
    tbcItems: stringArraySchema,
    missingItems: stringArraySchema,
    riskFlags: stringArraySchema,
    suggestedActions: stringArraySchema,
    opsSummary: { type: "string" },
  },
} as const;

export const extractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "templateName",
    "templateRevision",
    "headerFields",
    "checklistItems",
    "review",
  ],
  properties: {
    templateName: {
      type: "string",
      const: TEMPLATE_NAME,
    },
    templateRevision: {
      type: "string",
      const: TEMPLATE_REVISION,
    },
    headerFields: {
      type: "array",
      minItems: HEADER_FIELDS.length,
      maxItems: HEADER_FIELDS.length,
      items: headerFieldSchema,
    },
    checklistItems: {
      type: "array",
      minItems: CHECKLIST_ITEMS.length,
      maxItems: CHECKLIST_ITEMS.length,
      items: checklistItemSchema,
    },
    review: reviewSchema,
  },
} as const;
