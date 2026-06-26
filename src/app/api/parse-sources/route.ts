import { NextRequest, NextResponse } from "next/server";
import { extractBufferText } from "@/lib/extractFileText";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);

    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    const parsed = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await extractBufferText(buffer, file.name, file.type);
      parsed.push(result);
    }

    const combinedText = parsed
      .map((source) => {
        const warning = source.warning ? `\nWarning: ${source.warning}` : "";
        return `SOURCE FILE: ${source.fileName}\nTYPE: ${source.fileType}${warning}\n---\n${source.extractedText}`;
      })
      .join("\n\n==============================\n\n")
      .trim();

    return NextResponse.json({ parsed, combinedText });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "File upload parsing failed." }, { status: 500 });
  }
}
