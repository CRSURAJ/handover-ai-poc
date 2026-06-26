import { CHECKLIST_ITEMS, HEADER_FIELDS, TEMPLATE_NAME, TEMPLATE_REVISION } from "./template";

export const extractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["templateName", "templateRevision", "headerFields", "checklistItems", "review"],
  properties: {
    templateName: { type: "string", const: TEMPLATE_NAME },
    templateRevision: { type: "string", const: TEMPLATE_REVISION },
    headerFields: {
      type: "array",
      minItems: HEADER_FIELDS.length,
      maxItems: HEADER_FIELDS.length,
      items: {
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
          "reasoningNote"
        ],
        properties: {
          fieldKey: { type: "string" },
          fieldLabel: { type: "string" },
          extractedValue: { type: ["string", "null"] },
          status: { enum: ["filled", "missing", "needs_review", "conflict"] },
          confidence: { enum: ["high", "medium", "low"] },
          sourceName: { type: "string" },
          evidenceText: { type: "string" },
          reasoningNote: { type: "string" }
        }
      }
    },
    checklistItems: {
      type: "array",
      minItems: CHECKLIST_ITEMS.length,
      maxItems: CHECKLIST_ITEMS.length,
      items: {
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
          "reasoningNote"
        ],
        properties: {
          category: { type: "string" },
          itemLabel: { type: "string" },
          suggestedStatus: {
            enum: [
              "not_started",
              "complete",
              "pending",
              "tbc",
              "requires_review",
              "critical_issue",
              "not_applicable"
            ]
          },
          comments: { type: "string" },
          remarks: { type: "string" },
          handoverMeetingNotes: { type: "string" },
          confidence: { enum: ["high", "medium", "low"] },
          sourceName: { type: "string" },
          evidenceText: { type: "string" },
          reasoningNote: { type: "string" }
        }
      }
    },
    review: {
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
        "opsSummary"
      ],
      properties: {
        overallStatus: { enum: ["ok", "requires_review", "critical"] },
        riskLevel: { enum: ["low", "medium", "high", "critical"] },
        executiveSummary: { type: "string" },
        tbcItems: { type: "array", items: { type: "string" } },
        missingItems: { type: "array", items: { type: "string" } },
        riskFlags: { type: "array", items: { type: "string" } },
        suggestedActions: { type: "array", items: { type: "string" } },
        opsSummary: { type: "string" }
      }
    }
  }
} as const;
