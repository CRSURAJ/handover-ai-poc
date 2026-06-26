declare module "pdf-parse" {
  function pdfParse(buffer: Buffer): Promise<{ text: string; numpages: number }>;
  export default pdfParse;
}

declare module "mailparser" {
  export interface ParsedMail {
    subject?: string;
    from?: { text: string };
    to?: { text: string };
    date?: Date;
    text?: string;
    html?: string | false;
    attachments?: Array<{
      filename?: string;
      content: Buffer;
      contentType?: string;
      size?: number;
    }>;
  }

  export function simpleParser(
    source: Buffer | string,
  ): Promise<ParsedMail>;
}
