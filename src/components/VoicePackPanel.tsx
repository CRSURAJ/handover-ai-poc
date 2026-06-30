"use client";

import { useRef, useState } from "react";

type VoicePackPanelProps = {
  onTranscriptChange?: (transcript: string) => void;
};

export function VoicePackPanel({ onTranscriptChange }: VoicePackPanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access denied.");
      return;
    }

    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      await sendToWhisper(blob);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setIsTranscribing(true);
  }

  async function sendToWhisper(blob: Blob) {
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");

      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || data.error || "Transcription failed.");

      const updated = transcript ? transcript + " " + data.transcript : data.transcript;
      setTranscript(updated);
      onTranscriptChange?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcription failed.");
    } finally {
      setIsTranscribing(false);
    }
  }

  function toggle() {
    if (isRecording) stopRecording();
    else startRecording();
  }

  function clear() {
    setTranscript("");
    setError(null);
    onTranscriptChange?.("");
  }

  const busy = isRecording || isTranscribing;

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2>Voice Pack</h2>
          <p className="subtle">Speak to transcribe notes for the checklist.</p>
        </div>
      </div>

      <div className="fieldGroup">
        <div className={`transcribeBlock${isRecording ? " transcribeBlock--recording" : ""}${isTranscribing ? " transcribeBlock--processing" : ""}`}>
          {isTranscribing ? (
            <p className="transcribePlaceholder">
              <span className="uploadSpinner" style={{ display: "inline-block", marginRight: 8 }} />
              Transcribing…
            </p>
          ) : transcript ? (
            <p className="transcribeText">{transcript}</p>
          ) : (
            <p className="transcribePlaceholder">
              {isRecording ? "Recording… speak now." : "Press Start and begin speaking."}
            </p>
          )}
        </div>
      </div>

      <div className="sourceActions">
        <button
          className={`button sourceActionButton${isRecording ? " recordingActiveBtn" : ""}`}
          onClick={toggle}
          disabled={isTranscribing}
        >
          {isRecording ? "⏹ Stop" : "🎙 Start recording"}
        </button>

        {transcript && !busy && (
          <button className="button sourceActionButton resetButton" onClick={clear}>
            ↺ Clear
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}
    </section>
  );
}
