export type ExtractedSource = {
  fileName: string;
  fileType: string;
  extractedText: string;
  warning?: string;
};

const SPREADSHEET_EXTENSIONS = ["xlsx", "xls", "xlsm", "csv"];
const TEXT_EXTENSIONS = ["txt", "md", "html", "htm"];

function extensionOf(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

function bufferToText(buffer: Buffer) {
  return buffer.toString("utf8").replace(/\u0000/g, " ").trim();
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseMimeType(mimeType: string) {
  return mimeType.toLowerCase().trim();
}

function isPdf(ext: string, mimeType: string) {
  return ext === "pdf" || mimeType.includes("pdf");
}

function isDocx(ext: string, mimeType: string) {
  return ext === "docx" || mimeType.includes("wordprocessingml");
}

function isSpreadsheet(ext: string, mimeType: string) {
  return (
    SPREADSHEET_EXTENSIONS.includes(ext) || mimeType.includes("spreadsheet")
  );
}

function isEmail(ext: string, mimeType: string) {
  return ext === "eml" || mimeType.includes("message/rfc822");
}

function isTextLike(ext: string, mimeType: string) {
  return TEXT_EXTENSIONS.includes(ext) || mimeType.startsWith("text/");
}

async function extractPdf(buffer: Buffer) {
  const pdfParse = (await import("pdf-parse")).default as any;
  const data = await pdfParse(buffer);

  return String(data.text || "").trim();
}

async function extractDocx(buffer: Buffer) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });

  return String(result.value || "").trim();
}

async function extractXlsx(buffer: Buffer) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sections: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: "\t" }).trim();

    if (csv) {
      sections.push(`Sheet: ${sheetName}\n${csv}`);
    }
  }

  return sections.join("\n\n");
}

async function extractEmail(buffer: Buffer, fileName: string) {
  try {
    const { simpleParser } = await import("mailparser");
    const parsed = await simpleParser(buffer as any);
    const sections: string[] = [];

    sections.push(`Email source: ${fileName}`);

    if (parsed.subject) {
      sections.push(`Subject: ${parsed.subject}`);
    }

    if (parsed.from?.text) {
      sections.push(`From: ${parsed.from.text}`);
    }

    if (parsed.to?.text) {
      sections.push(`To: ${parsed.to.text}`);
    }

    if (parsed.date) {
      sections.push(`Date: ${parsed.date.toISOString()}`);
    }

    if (parsed.text) {
      sections.push(`Body:\n${parsed.text}`);
    } else if (parsed.html) {
      sections.push(`Body:\n${stripHtml(String(parsed.html))}`);
    }

    if (parsed.attachments?.length) {
      sections.push(
        `Attachments found: ${parsed.attachments
          .map((attachment: any) => attachment.filename || "unnamed")
          .join(", ")}`,
      );

      for (const attachment of parsed.attachments as any[]) {
        const attachmentName = attachment.filename || "unnamed-attachment";

        try {
          const attachmentText = await extractBufferText(
            Buffer.from(attachment.content),
            attachmentName,
            attachment.contentType || "",
          );

          if (attachmentText.extractedText) {
            sections.push(
              `Attachment: ${attachmentName}\n${attachmentText.extractedText}`,
            );
          } else if (attachmentText.warning) {
            sections.push(
              `Attachment: ${attachmentName}\nWarning: ${attachmentText.warning}`,
            );
          }
        } catch {
          sections.push(
            `Attachment: ${attachmentName}\nWarning: Could not parse this attachment.`,
          );
        }
      }
    }

    return sections.join("\n\n").trim();
  } catch {
    return bufferToText(buffer);
  }
}

function buildTextSource(
  buffer: Buffer,
  fileName: string,
  ext: string,
): ExtractedSource {
  const raw = bufferToText(buffer);
  const shouldStripHtml = ext === "html" || ext === "htm";

  return {
    fileName,
    fileType: ext || "text",
    extractedText: shouldStripHtml ? stripHtml(raw) : raw,
  };
}

function buildUnsupportedSource(
  buffer: Buffer,
  fileName: string,
  ext: string,
  mimeType: string,
): ExtractedSource {
  return {
    fileName,
    fileType: ext || mimeType || "unknown",
    extractedText: bufferToText(buffer),
    warning: "Unsupported file type. Tried to read as plain text.",
  };
}

function buildParseErrorSource(
  error: unknown,
  fileName: string,
  ext: string,
  mimeType: string,
): ExtractedSource {
  return {
    fileName,
    fileType: ext || mimeType || "unknown",
    extractedText: "",
    warning: error instanceof Error ? error.message : "Could not parse file.",
  };
}

export async function extractBufferText(
  buffer: Buffer,
  fileName: string,
  mimeType = "",
): Promise<ExtractedSource> {
  const ext = extensionOf(fileName);
  const normalisedMimeType = normaliseMimeType(mimeType);

  try {
    if (isPdf(ext, normalisedMimeType)) {
      return {
        fileName,
        fileType: "pdf",
        extractedText: await extractPdf(buffer),
      };
    }

    if (isDocx(ext, normalisedMimeType)) {
      return {
        fileName,
        fileType: "docx",
        extractedText: await extractDocx(buffer),
      };
    }

    if (isSpreadsheet(ext, normalisedMimeType)) {
      if (ext === "csv") {
        return {
          fileName,
          fileType: "csv",
          extractedText: bufferToText(buffer),
        };
      }

      return {
        fileName,
        fileType: "xlsx",
        extractedText: await extractXlsx(buffer),
      };
    }

    if (isEmail(ext, normalisedMimeType)) {
      return {
        fileName,
        fileType: "email",
        extractedText: await extractEmail(buffer, fileName),
      };
    }

    if (isTextLike(ext, normalisedMimeType)) {
      return buildTextSource(buffer, fileName, ext);
    }

    return buildUnsupportedSource(buffer, fileName, ext, normalisedMimeType);
  } catch (error) {
    return buildParseErrorSource(error, fileName, ext, normalisedMimeType);
  }
}
