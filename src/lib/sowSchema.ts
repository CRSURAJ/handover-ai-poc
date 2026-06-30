export const sowJsonSchema = {
  type: "object",
  required: [
    "projectName", "client", "worksDescription", "siteAddress",
    "quoteReference", "poNumber", "scopeFlags", "overview",
    "removalItems", "supplySections", "installDescription", "installItems",
    "electricalSections", "ancillaryItems", "commissioningDescription",
    "commissioningItems", "exclusions", "deliveryNote", "footerNote",
  ],
  additionalProperties: false,
  properties: {
    projectName:      { type: "string" },
    client:           { type: "string" },
    worksDescription: { type: "string" },
    siteAddress:      { type: "string" },
    quoteReference:   { type: "string" },
    poNumber:         { type: "string" },

    scopeFlags: {
      type: "object",
      required: [
        "hasRemoval", "hasSupply", "isPrefabSkid", "installOnly",
        "hasElectrical", "hasAncillaries", "hasFat", "hasPreliminaryDrawings",
        "hasCommissioning", "hasProgramme", "hasDelivery",
      ],
      additionalProperties: false,
      properties: {
        hasRemoval:             { type: "boolean" },
        hasSupply:              { type: "boolean" },
        isPrefabSkid:           { type: "boolean" },
        installOnly:            { type: "boolean" },
        hasElectrical:          { type: "boolean" },
        hasAncillaries:         { type: "boolean" },
        hasFat:                 { type: "boolean" },
        hasPreliminaryDrawings: { type: "boolean" },
        hasCommissioning:       { type: "boolean" },
        hasProgramme:           { type: "boolean" },
        hasDelivery:            { type: "boolean" },
      },
    },

    overview:    { type: "string" },
    removalItems: { type: "array", items: { type: "string" } },

    supplySections: {
      type: "array",
      items: {
        type: "object",
        required: ["subtitle", "description", "items"],
        additionalProperties: false,
        properties: {
          subtitle:    { type: "string" },
          description: { type: "string" },
          items:       { type: "array", items: { type: "string" } },
        },
      },
    },

    installDescription: { type: "string" },
    installItems:       { type: "array", items: { type: "string" } },

    electricalSections: {
      type: "array",
      items: {
        type: "object",
        required: ["subtitle", "items"],
        additionalProperties: false,
        properties: {
          subtitle: { type: "string" },
          items:    { type: "array", items: { type: "string" } },
        },
      },
    },

    ancillaryItems:           { type: "array", items: { type: "string" } },
    commissioningDescription: { type: "string" },
    commissioningItems:       { type: "array", items: { type: "string" } },
    exclusions:               { type: "array", items: { type: "string" } },
    deliveryNote:             { type: "string" },
    footerNote:               { type: "string" },
  },
} as const;
