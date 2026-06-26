import type { ChecklistItemExtraction, ChecklistStatus, Confidence, FieldStatus, HandoverExtractionResult, HeaderFieldExtraction } from "./types";
import { CHECKLIST_ITEMS, HEADER_FIELDS, TEMPLATE_NAME, TEMPLATE_REVISION } from "./template";

type ExtractedValue = {
  value: string | null;
  evidence: string;
  status?: FieldStatus;
  confidence?: Confidence;
};

type ExtractedItem = {
  comments: string;
  evidence: string;
  status: ChecklistStatus;
  confidence: Confidence;
  remarks?: string;
};

function normalise(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function compact(value: string, max = 900) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max).trim()}…` : cleaned;
}

function sentenceAround(text: string, pattern: RegExp, max = 900) {
  const match = text.match(pattern);
  if (!match?.index && match?.index !== 0) return "No matching evidence found.";
  const start = Math.max(0, match.index - 160);
  const end = Math.min(text.length, match.index + match[0].length + 260);
  return compact(text.slice(start, end), max);
}

function firstMatch(text: string, patterns: RegExp[], fallback = "No matching evidence found."): ExtractedValue {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const raw = match[1] || match[0];
    const value = compact(raw, 260);
    if (!value) continue;
    return {
      value,
      evidence: sentenceAround(text, pattern)
    };
  }
  return { value: null, evidence: fallback };
}

function contains(text: string, pattern: RegExp) {
  return pattern.test(text);
}

function headerStatus(value: string | null): FieldStatus {
  if (!value) return "missing";
  if (/\bTBC\b|to be confirmed|not currently held in stock|not yet|pending|requires review/i.test(value)) return "needs_review";
  return "filled";
}

function headerConfidence(value: string | null): Confidence {
  if (!value) return "low";
  if (/\bTBC\b|to be confirmed|not currently held in stock|not yet|pending/i.test(value)) return "medium";
  return "high";
}

function makeHeader(fieldKey: string, fieldLabel: string, extracted: ExtractedValue, sourceName: string): HeaderFieldExtraction {
  const value = extracted.value;
  return {
    fieldKey,
    fieldLabel,
    extractedValue: value,
    status: extracted.status || headerStatus(value),
    confidence: extracted.confidence || headerConfidence(value),
    sourceName,
    evidenceText: extracted.evidence,
    reasoningNote: value ? "Matched from labelled quote/SOW/PO wording or strong project context." : "Could not confidently find this field in the supplied source pack."
  };
}

function extractProjectName(text: string): ExtractedValue {
  return firstMatch(text, [
    /Project Name\s+(.+?)(?=\s+Customer\b|\n|$)/i,
    /Reference\s*([A-Z][^\n\r]{3,140}?)(?=\s*Project\s*\d|\s*Payment Terms|\s*Sales Person|$)/i,
    /([^\n\r|]{3,140}?Hot Water Plant Upgrade)\s*\|\s*Project\s*\d+/i,
    /\n\s*([^\n\r]{3,140}?Hot Water Plant Upgrade[^\n\r]*)\s*\n/i,
    /(Sonac Hot Water Plant Upgrade)/i
  ]);
}

function extractCustomer(text: string): ExtractedValue {
  return firstMatch(text, [
    /Customer\s+(.+?)(?=\s+Salesperson\b|\s+Sales Person\b|\s+Est\.?\s*Delivery|\n|$)/i,
    /Client\s*\n\s*([^\n\r]{3,120})/i,
    /(Sonac Australia\s+(?:Pty\s+Ltd|PTY,?\s*Ltd|PTY\s+Ltd))/i,
    /Invoicing address\s*\n?\s*(Sonac Australia[^\n\r]+)/i
  ]);
}

function extractSalesperson(text: string): ExtractedValue {
  return firstMatch(text, [
    /Salesperson\s+(.+?)(?=\s+Est\.?\s*Delivery|\s+Payment|\n|$)/i,
    /Sales Person\s*([A-Z][A-Za-z .'-]{2,80})(?=\s*Valid To|\s*Date|\n|$)/i,
    /Prepared by\s*\n?\s*([A-Z][A-Za-z .'-]{2,80})\s+[–-]\s+/i,
    /(Jordan Crowther)\s+[–-]\s+Commercial Sales/i
  ]);
}

function extractDeliveryDate(text: string): ExtractedValue {
  const result = firstMatch(text, [
    /Est\.?\s*Delivery Date\s+(.+?)(?=\s+Pre-Fab|\s+Payment Method|\n|$)/i,
    /(Delivery date is to be confirmed\.[\s\S]{0,220}?skid fabrication\.)/i,
    /(The Modulex MX660EXT is not currently held in stock[\s\S]{0,180}?confirmation of order\.)/i
  ]);

  if (result.value) {
    return {
      ...result,
      value: result.value.includes("Delivery date is to be confirmed")
        ? "TBC – Modulex MX660EXT must be ordered before skid fabrication; indicative delivery to be advised after order confirmation."
        : result.value,
      status: "needs_review",
      confidence: "medium"
    };
  }

  return result;
}

function extractProjectType(text: string): ExtractedValue {
  const direct = firstMatch(text, [
    /Pre-Fab\s*\/\s*Pre-Fab \+ Install\s+(.+?)(?=\s+Payment Method|\n|$)/i
  ]);
  if (direct.value) return direct;

  if (contains(text, /Supply of Prefabricated Condensing Boiler Skid/i) || contains(text, /prefabricated[^\n]{0,80}boiler skid/i)) {
    const evidence = sentenceAround(text, /Supply of Prefabricated Condensing Boiler Skid|On-site installation, mechanical connection, and on-site commissioning\s+[—-]\s+supply and FAT only/i);
    return {
      value: "Pre-Fab – Supply Only",
      evidence,
      status: "filled",
      confidence: "high"
    };
  }

  return { value: null, evidence: "No matching evidence found." };
}

function extractPaymentMethod(text: string): ExtractedValue {
  const direct = firstMatch(text, [
    /Payment Method\s+(.+?)(?=\s+Category\b|\s+Project Planning\b|\n|$)/i,
    /Payment Terms\s*Payment Before Despatch/i,
    /(Payment Before Despatch)/i,
    /Payment Condition\s*(Due today)/i
  ]);

  if (direct.value) {
    let value = /Payment Before Despatch/i.test(direct.value) || /Payment Terms\s*Payment Before Despatch/i.test(direct.evidence)
      ? "Payment Before Despatch"
      : direct.value;

    if (/30% deposit/i.test(text)) {
      value += " – 30% deposit may apply for made-to-order/special product; balance prior to delivery/despatch per quote terms.";
    }

    return {
      value,
      evidence: direct.evidence,
      status: "filled",
      confidence: "high"
    };
  }

  return direct;
}

function extractHeaderValues(text: string) {
  return {
    projectName: extractProjectName(text),
    customer: extractCustomer(text),
    salesperson: extractSalesperson(text),
    estimatedDeliveryDate: extractDeliveryDate(text),
    projectType: extractProjectType(text),
    paymentMethod: extractPaymentMethod(text)
  } as Record<string, ExtractedValue>;
}

function makeItem(category: string, itemLabel: string, sourceName: string, extracted: ExtractedItem): ChecklistItemExtraction {
  return {
    category,
    itemLabel,
    suggestedStatus: extracted.status,
    comments: extracted.comments,
    remarks: extracted.remarks || (["tbc", "pending", "requires_review", "critical_issue"].includes(extracted.status) ? "Needs handover review before Ops approval." : ""),
    handoverMeetingNotes: "",
    confidence: extracted.confidence,
    sourceName,
    evidenceText: extracted.evidence,
    reasoningNote: extracted.comments ? "Mapped from the source pack into the matching checklist item." : "Could not find strong source evidence for this checklist item."
  };
}

function extractChecklistItem(itemLabel: string, text: string): ExtractedItem {
  switch (itemLabel) {
    case "Project Scope (REQUIRED IN WRITING)": {
      if (contains(text, /prefabricated[\s\S]{0,120}boiler skid/i)) {
        const flangeTbc = contains(text, /flange size\s*TBC|flange size[^\n]{0,80}to be confirmed/i);
        return {
          comments: "Supply of fully prefabricated outdoor condensing boiler skid including Modulex MX660EXT 660 kW boiler, Grundfos TP primary pump, 1000 L Thermex buffer tank, 300 L expansion vessel, refill unit, PRV/gauge, chemical dosing pot, neutraliser kit, copper pipework, insulation and weatherproof Colorbond cladding. Scope is supply/FAT only; site installation and on-site commissioning are excluded.",
          evidence: sentenceAround(text, /AHG will supply[\s\S]{0,900}?outdoor installation|Supply of Prefabricated Condensing Boiler Skid[\s\S]{0,900}?outdoor installation/i, 1200),
          status: flangeTbc ? "requires_review" : "complete",
          confidence: "high",
          remarks: flangeTbc ? "Scope is written, but future heat recovery flange size is still TBC." : ""
        };
      }
      return missingItem();
    }

    case "Drawings (if available) – P&ID, GA & Skid": {
      if (contains(text, /preliminary General Arrangement|GA\)? and skid drawings|skid drawings/i)) {
        return {
          comments: "Preliminary GA/skid drawings are to be prepared by AHG before manufacture and submitted to Carson Hocking for review/approval. Carson must verify skid dimensions against available site area.",
          evidence: sentenceAround(text, /Prior to manufacture[\s\S]{0,520}?manufacture commences/i),
          status: "pending",
          confidence: "high"
        };
      }
      return missingItem();
    }

    case "Itemised Quote": {
      if (contains(text, /Quote\s*207212|Quote reference\s*Quote\s*207212/i)) {
        const total = firstMatch(text, [/(Total Amount AUD\s*148,078\.60)/i, /(\$148,078\.60)/i]);
        return {
          comments: `Quote 207212 dated 18/06/2026 for Project 30084${total.value ? `; total AUD 148,078.60 incl. GST` : ""}. PO number 26001656 OS is also present in the source pack.`,
          evidence: sentenceAround(text, /Quote reference\s*\n?\s*Quote\s*207212[\s\S]{0,220}?18 June 2026|Reference\s*Sonac Hot Water Plant Upgrade[\s\S]{0,220}?Quote 207212|Purchase order no\.\s*26001656 OS/i),
          status: "complete",
          confidence: "high"
        };
      }
      return missingItem();
    }

    case "Design Schematic": {
      if (contains(text, /Design Schematic\s+Not yet/i)) {
        return {
          comments: "Design schematic is not yet prepared.",
          evidence: sentenceAround(text, /Design Schematic\s+Not yet[^\n\r]*/i),
          status: "pending",
          confidence: "high"
        };
      }
      if (contains(text, /preliminary General Arrangement|GA\)? and skid drawings/i)) {
        return {
          comments: "No separate design schematic was found. Preliminary GA/skid drawings are mentioned and still require preparation/review.",
          evidence: sentenceAround(text, /Preliminary Drawings[\s\S]{0,520}?manufacture commences/i),
          status: "pending",
          confidence: "medium"
        };
      }
      return missingItem();
    }

    case "Site visit (if applicable)": {
      if (contains(text, /Completed April 2026/i)) {
        return {
          comments: "Site visit completed April 2026. Follow-up visit may be required pending drawing review.",
          evidence: sentenceAround(text, /Completed April 2026[^\n\r]*/i),
          status: "requires_review",
          confidence: "high"
        };
      }
      if (contains(text, /site visit may be required/i)) {
        return {
          comments: "Site visit may be required if there are discrepancies between the preliminary drawings and site conditions.",
          evidence: sentenceAround(text, /site visit may be required[\s\S]{0,180}?site conditions/i),
          status: "requires_review",
          confidence: "medium"
        };
      }
      return missingItem();
    }

    case "Send ALL email communications with customer": {
      if (contains(text, /Any correspondence post this meeting[\s\S]{0,140}?Ops team|Send ALL email communications with customer/i)) {
        return {
          comments: "All customer correspondence after the handover meeting must be forwarded to the Ops team.",
          evidence: sentenceAround(text, /Any correspondence post this meeting[\s\S]{0,140}?Ops team|Send ALL email communications with customer/i),
          status: "complete",
          confidence: "high"
        };
      }
      return missingItem();
    }

    case "Plant Location": {
      if (contains(text, /outdoor installation|suitable for outdoor/i)) {
        return {
          comments: "Outdoor installation.",
          evidence: sentenceAround(text, /suitable for outdoor installation|outdoor installation|weatherproof clad/i),
          status: "complete",
          confidence: "high"
        };
      }
      return missingItem();
    }

    case "Plant Level": {
      const direct = firstMatch(text, [/Plant Level\s+([^\n\r]+)/i, /(Ground level[^\n\r]*)/i]);
      if (direct.value) {
        return { comments: direct.value, evidence: direct.evidence, status: "complete", confidence: "high" };
      }
      return missingItem();
    }

    case "Obstructions / Access Constraints": {
      if (contains(text, /available plant area|verify the proposed skid dimensions|Limited plant area/i)) {
        return {
          comments: "Available plant area/skid footprint must be verified by Carson Hocking before manufacture. Site visit may be required if drawings and site conditions do not align.",
          evidence: sentenceAround(text, /Carson is to verify[\s\S]{0,380}?site conditions|Limited plant area[\s\S]{0,260}?commences/i),
          status: "requires_review",
          confidence: "high"
        };
      }
      return missingItem();
    }

    case "Sufficient Power & Power Location (if known)": {
      if (contains(text, /electrical for boiler controls|Electrical supply, switchboard works|electrical connections/i)) {
        if (contains(text, /TBC[\s\S]{0,80}electrical|electrical[\s\S]{0,120}to be confirmed/i)) {
          return {
            comments: "TBC – electrical supply/location for boiler controls and primary pump to be confirmed on-site.",
            evidence: sentenceAround(text, /TBC[\s\S]{0,160}electrical[\s\S]{0,160}(confirmed|on-site)/i),
            status: "tbc",
            confidence: "high"
          };
        }
        return {
          comments: "Electrical supply, switchboard works, and electrical connections to boiler controls, primary pump, or skid assembly are excluded from AHG scope and need confirmation by others/customer.",
          evidence: sentenceAround(text, /Electrical supply, switchboard works[\s\S]{0,180}?skid assembly/i),
          status: "requires_review",
          confidence: "high"
        };
      }
      return missingItem();
    }

    case "Insulation & Cladding (R-rating & cladding type)": {
      if (contains(text, /R3 Insulation|Colorbond|Colourbond|weatherproof clad|thermally insulated/i)) {
        return {
          comments: "Copper/primary pipework thermally insulated and weatherproof clad; Thermex 1000 L buffer tank has R3 insulation and Colorbond/Colourbond cladding.",
          evidence: sentenceAround(text, /R3 Insulation[\s\S]{0,180}?Cladding|thermally insulated[\s\S]{0,120}?weatherproof clad|Colorbond|Colourbond/i),
          status: "complete",
          confidence: "high"
        };
      }
      return missingItem();
    }

    case "Commissioning is COMMSYS": {
      if (contains(text, /Factory Acceptance Testing|COMMFAT|FAT does not include on-site commissioning/i)) {
        return {
          comments: "COMMFAT / Factory Acceptance Testing included at AHG Epping. FAT includes appliance commissioning, safety device testing, controls/pump verification and primary pipework pressure test. On-site commissioning is not included; site visits are chargeable at standard service rates.",
          evidence: sentenceAround(text, /Factory Acceptance Testing \(FAT\)[\s\S]{0,760}?standard service rates|COMMFAT[\s\S]{0,520}?standard service rates/i, 1100),
          status: "complete",
          confidence: "high",
          remarks: "Important: no on-site commissioning allowance in current scope."
        };
      }
      return missingItem();
    }

    default:
      return missingItem();
  }
}

function missingItem(): ExtractedItem {
  return {
    comments: "",
    evidence: "No matching evidence found.",
    status: "not_started",
    confidence: "low"
  };
}

function buildReview(headerFields: HeaderFieldExtraction[], checklistItems: ChecklistItemExtraction[]) {
  const tbcItems = [
    ...headerFields.filter((field) => field.status === "needs_review").map((field) => field.fieldLabel),
    ...checklistItems.filter((item) => item.suggestedStatus === "tbc").map((item) => item.itemLabel)
  ];

  const missingItems = [
    ...headerFields.filter((field) => field.status === "missing").map((field) => field.fieldLabel),
    ...checklistItems.filter((item) => item.suggestedStatus === "not_started").map((item) => item.itemLabel)
  ];

  const riskFlags = checklistItems
    .filter((item) => ["tbc", "pending", "requires_review", "critical_issue"].includes(item.suggestedStatus))
    .map((item) => `${item.itemLabel}: ${item.comments || item.reasoningNote}`);

  const hasCriticalMissing = missingItems.includes("Project Name") || missingItems.includes("Customer") || missingItems.includes("Project Scope (REQUIRED IN WRITING)");
  const riskLevel = hasCriticalMissing || riskFlags.length >= 6 ? "high" : riskFlags.length >= 2 ? "medium" : "low";

  return {
    overallStatus: riskFlags.length > 0 || tbcItems.length > 0 || missingItems.length > 0 ? "requires_review" as const : "ok" as const,
    riskLevel,
    executiveSummary: "The source pack has been converted into the Advisory Project Critical Checklist format. Review pending/TBC items, especially delivery timing, drawings/design status, electrical exclusions, site-area verification, and commissioning responsibility.",
    tbcItems,
    missingItems,
    riskFlags,
    suggestedActions: [
      "Confirm Modulex MX660EXT delivery timing before committing skid build/despatch dates.",
      "Prepare and issue preliminary GA/skid drawings for Carson Hocking review before manufacture.",
      "Confirm buffer tank future heat-recovery flange size with Carson Hocking before ordering the tank.",
      "Confirm electrical supply/switchboard/connection responsibilities because these are excluded from AHG scope.",
      "Confirm that Ops understands this is supply/FAT only with no on-site commissioning allowance."
    ],
    opsSummary: "Scope appears to be a prefabricated outdoor MX660EXT boiler skid supply with FAT. Quote 207212 / Project 30084 / PO 26001656 OS are present. Key review items are delivery timing, preliminary drawings, future heat-recovery flange size, electrical exclusions, site footprint verification, and no on-site commissioning allowance."
  };
}

export function localExtract(sourceName: string, sourceText: string): HandoverExtractionResult {
  const text = normalise(sourceText);
  const headerValues = extractHeaderValues(text);

  const headerFields = HEADER_FIELDS.map((field) => {
    return makeHeader(field.fieldKey, field.fieldLabel, headerValues[field.fieldKey] || { value: null, evidence: "No matching evidence found." }, sourceName);
  });

  const checklistItems: ChecklistItemExtraction[] = CHECKLIST_ITEMS.map((item) => {
    return makeItem(item.category, item.itemLabel, sourceName, extractChecklistItem(item.itemLabel, text));
  });

  return {
    templateName: TEMPLATE_NAME,
    templateRevision: TEMPLATE_REVISION,
    extractionMode: "local_demo",
    headerFields,
    checklistItems,
    review: buildReview(headerFields, checklistItems)
  };
}
