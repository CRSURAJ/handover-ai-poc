import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return new OpenAI({ apiKey, maxRetries: 2 });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get("audio");

  if (!audio || !(audio instanceof Blob)) {
    return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
  }

  try {
    const client = getOpenAIClient();
    const file = new File([audio], "recording.webm", { type: audio.type || "audio/webm" });

    const model = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";

    const result = await client.audio.transcriptions.create({
      model,
      file,
      response_format: "text",
    });

    return NextResponse.json({ transcript: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Transcription failed.", detail: message }, { status: 502 });
  }
}
