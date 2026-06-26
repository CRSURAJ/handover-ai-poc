type ExtractedSource = {
  fileName: string;
  fileType: string;
  extractedText: string;
  warning?: string;
};

function extensionOf(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

function bufferToText(buffer: Buffer) {
  return buffer.toString("utf8").replace(/\u0000/g, " ").trim();
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
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
    if (csv) sections.push(`Sheet: ${sheetName}\n${csv}`);
  }

  return sections.join("\n\n");
}

async function extractEmail(buffer: Buffer, fileName: string) {
  try {
    const { simpleParser } = await import("mailparser");
    const parsed = await simpleParser(buffer as any);
    const sections: string[] = [];

    sections.push(`Email source: ${fileName}`);
    if (parsed.subject) sections.push(`Subject: ${parsed.subject}`);
    if (parsed.from?.text) sections.push(`From: ${parsed.from.text}`);
    if (parsed.to?.text) sections.push(`To: ${parsed.to.text}`);
    if (parsed.date) sections.push(`Date: ${parsed.date.toISOString()}`);
    if (parsed.text) sections.push(`Body:\n${parsed.text}`);
    else if (parsed.html) sections.push(`Body:\n${stripHtml(String(parsed.html))}`);

    if (parsed.attachments?.length) {
      sections.push(`Attachments found: ${parsed.attachments.map((a: any) => a.filename || "unnamed").join(", ")}`);

      for (const attachment of parsed.attachments as any[]) {
        const attachmentName = attachment.filename || "unnamed-attachment";
        try {
          const attachmentText = await extractBufferText(Buffer.from(attachment.content), attachmentName, attachment.contentType || "");
          if (attachmentText.extractedText) {
            sections.push(`Attachment: ${attachmentName}\n${attachmentText.extractedText}`);
          } else if (attachmentText.warning) {
            sections.push(`Attachment: ${attachmentName}\nWarning: ${attachmentText.warning}`);
          }
        } catch (err) {
          sections.push(`Attachment: ${attachmentName}\nWarning: Could not parse this attachment.`);
        }
      }
    }

    return sections.join("\n\n").trim();
  } catch {
    return bufferToText(buffer);
  }
}

export async function extractBufferText(buffer: Buffer, fileName: string, mimeType = ""): Promise<ExtractedSource> {
  const ext = extensionOf(fileName);
  const normalizedMime = mimeType.toLowerCase();

  try {
    if (ext === "pdf" || normalizedMime.includes("pdf")) {
      return { fileName, fileType: "pdf", extractedText: await extractPdf(buffer) };
    }

    if (ext === "docx" || normalizedMime.includes("wordprocessingml")) {
      return { fileName, fileType: "docx", extractedText: await extractDocx(buffer) };
    }

    if (["xlsx", "xls", "xlsm", "csv"].includes(ext) || normalizedMime.includes("spreadsheet")) {
      if (ext === "csv") {
        return { fileName, fileType: "csv", extractedText: bufferToText(buffer) };
      }
      return { fileName, fileType: "xlsx", extractedText: await extractXlsx(buffer) };
    }

    if (ext === "eml" || normalizedMime.includes("message/rfc822")) {
      return { fileName, fileType: "email", extractedText: await extractEmail(buffer, fileName) };
    }

    if (["txt", "md", "html", "htm"].includes(ext) || normalizedMime.startsWith("text/")) {
      const raw = bufferToText(buffer);
      return {
        fileName,
        fileType: ext || "text",
        extractedText: ext === "html" || ext === "htm" ? stripHtml(raw) : raw
      };
    }

    return {
      fileName,
      fileType: ext || normalizedMime || "unknown",
      extractedText: bufferToText(buffer),
      warning: "Unsupported file type. Tried to read as plain text."
    };
  } catch (error) {
    return {
      fileName,
      fileType: ext || normalizedMime || "unknown",
      extractedText: "",
      warning: error instanceof Error ? error.message : "Could not parse file."
    };
  }
}
