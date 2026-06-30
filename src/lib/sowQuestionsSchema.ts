export const sowQuestionsJsonSchema = {
  type: "object",
  required: ["questions"],
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "question", "hint", "type", "choices", "defaultValue"],
        additionalProperties: false,
        properties: {
          id:           { type: "string" },
          question:     { type: "string" },
          hint:         { type: "string" },
          type:         { type: "string", enum: ["boolean", "text", "choice", "date"] },
          choices:      { type: "array", items: { type: "string" } },
          defaultValue: { type: "string" },
        },
      },
    },
  },
} as const;
