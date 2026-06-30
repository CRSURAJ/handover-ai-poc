export type SowQuestionType = "boolean" | "text" | "choice" | "date";

export type SowQuestion = {
  id: string;
  question: string;
  hint: string;
  type: SowQuestionType;
  choices: string[];
  defaultValue: string;
};

export type SowQuestionsResult = {
  questions: SowQuestion[];
};
