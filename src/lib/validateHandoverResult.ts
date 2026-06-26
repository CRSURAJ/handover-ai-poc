import {
  CHECKLIST_ITEMS,
  HEADER_FIELDS,
  TEMPLATE_NAME,
  TEMPLATE_REVISION,
} from "@/lib/template";
import type {
  ChecklistStatus,
  Confidence,
  FieldStatus,
  HandoverExtractionResult,
} from "@/lib/types";

const fieldStatuses = new Set<FieldStatus>([
  "filled",
  "missing",
  "needs_review",
  "conflict",
]);

const confidences = new Set<Confidence>(["high", "medium", "low"]);

const checklistStatuses = new Set<ChecklistStatus>([
  "not_started",
  "complete",
  "pending",
  "tbc",
  "requires_review",
  "critical_issue",
  "not_applicable",
]);

const overallStatuses = new Set(["ok", "requires_review", "critical"]);

const riskLevels = new Set(["low", "medium", "high", "critical"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function requireString(
  object: Record<string, unknown>,
  key: string,
  path: string,
) {
  if (typeof object[key] !== "string") {
    throw new Error(`${path}.${key} must be a string.`);
  }
}

function requireNullableString(
  object: Record<string, unknown>,
  key: string,
  path: string,
) {
  if (object[key] !== null && typeof object[key] !== "string") {
    throw new Error(`${path}.${key} must be a string or null.`);
  }
}

function requireStringEnum<T extends string>(
  object: Record<string, unknown>,
  key: string,
  allowed: Set<T>,
  path: string,
) {
  const value = object[key];

  if (typeof value !== "string" || !allowed.has(value as T)) {
    throw new Error(`${path}.${key} has an invalid value.`);
  }
}

function requireStringArray(
  object: Record<string, unknown>,
  key: string,
  path: string,
) {
  if (!isStringArray(object[key])) {
    throw new Error(`${path}.${key} must be an array of strings.`);
  }
}

function validateHeaderFields(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("headerFields must be an array.");
  }

  if (value.length !== HEADER_FIELDS.length) {
    throw new Error(
      `headerFields must contain exactly ${HEADER_FIELDS.length} items.`,
    );
  }

  value.forEach((field, index) => {
    const path = `headerFields[${index}]`;

    if (!isObject(field)) {
      throw new Error(`${path} must be an object.`);
    }

    requireString(field, "fieldKey", path);
    requireString(field, "fieldLabel", path);
    requireNullableString(field, "extractedValue", path);
    requireStringEnum(field, "status", fieldStatuses, path);
    requireStringEnum(field, "confidence", confidences, path);
    requireString(field, "sourceName", path);
    requireString(field, "evidenceText", path);
    requireString(field, "reasoningNote", path);

    // Cross-field: "filled" status must have non-empty evidence.
    if (field.status === "filled" && !(field.evidenceText as string).trim()) {
      throw new Error(
        `${path}.evidenceText must not be empty when status is "filled".`,
      );
    }
  });
}

function validateChecklistItems(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("checklistItems must be an array.");
  }

  if (value.length !== CHECKLIST_ITEMS.length) {
    throw new Error(
      `checklistItems must contain exactly ${CHECKLIST_ITEMS.length} items.`,
    );
  }

  value.forEach((item, index) => {
    const path = `checklistItems[${index}]`;

    if (!isObject(item)) {
      throw new Error(`${path} must be an object.`);
    }

    requireString(item, "category", path);
    requireString(item, "itemLabel", path);
    requireStringEnum(item, "suggestedStatus", checklistStatuses, path);
    requireString(item, "comments", path);
    requireString(item, "remarks", path);
    requireString(item, "handoverMeetingNotes", path);
    requireStringEnum(item, "confidence", confidences, path);
    requireString(item, "sourceName", path);
    requireString(item, "evidenceText", path);
    requireString(item, "reasoningNote", path);
  });
}

function validateReview(value: unknown) {
  if (!isObject(value)) {
    throw new Error("review must be an object.");
  }

  requireStringEnum(value, "overallStatus", overallStatuses, "review");
  requireStringEnum(value, "riskLevel", riskLevels, "review");
  requireString(value, "executiveSummary", "review");
  requireStringArray(value, "tbcItems", "review");
  requireStringArray(value, "missingItems", "review");
  requireStringArray(value, "riskFlags", "review");
  requireStringArray(value, "suggestedActions", "review");
  requireString(value, "opsSummary", "review");
}

export function assertHandoverExtractionResult(
  value: unknown,
): asserts value is HandoverExtractionResult {
  if (!isObject(value)) {
    throw new Error("Extraction result must be an object.");
  }

  if (value.templateName !== TEMPLATE_NAME) {
    throw new Error("templateName does not match the expected template.");
  }

  if (value.templateRevision !== TEMPLATE_REVISION) {
    throw new Error("templateRevision does not match the expected revision.");
  }

  if (value.extractionMode !== "ai") {
    throw new Error('extractionMode must be "ai".');
  }

  validateHeaderFields(value.headerFields);
  validateChecklistItems(value.checklistItems);
  validateReview(value.review);
}

export function parseHandoverExtractionResult(
  value: unknown,
): HandoverExtractionResult {
  assertHandoverExtractionResult(value);
  return value;
}
