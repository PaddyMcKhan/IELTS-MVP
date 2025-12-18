"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PartKey = "part1" | "part2" | "part3" | "unknown";

type SpeakingScoreJson = {
  overall_band: number;
  fluency_coherence: number;
  lexical_resource: number;
  grammatical_range_accuracy: number;
  pronunciation: number;
  estimated_words: number;
  estimated_duration_seconds: number;
  part: PartKey;
  band_explanation_overall: string;
  strengths: string[];
  weaknesses: string[];
  improvement_tips: string[];
  long_feedback_overall?: string;
  long_feedback_fluency_coherence?: string;
  long_feedback_lexical_resource?: string;
  long_feedback_grammar_pronunciation?: string;
};

interface SpeakingRecorderProps {
  part: PartKey;
  questionId: string;
  questionPrompt?: string | null; // ✅ NEW
  durationSeconds: number;
  notes: string;
  userId: string | null;
  isPro: boolean;
  onSessionStart?: () => void;
  onScore?: (payload: { score: SpeakingScoreJson; transcript: string | null }) => void;
}

export function SpeakingRecorder({
  part,
  questionId,
  questionPrompt,
  durationSeconds,
  notes,
  userId,
  isPro,
  onSessionStart,
  onScore,
}: SpeakingRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [saveStatus, setSaveStatus] = useState<{
    savedAttempt: boolean;
    attemptId: string | null;
    saveError: string | null;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const stopTimeoutRef = useRef<number | null>(null);

  const canUsePro = isPro;

  const filename = useMemo(() => {
    const safePart = (part ?? "unknown").toString();
    return `answer-${safePart}-${Date.now()}.webm`;
  }, [part]);

  const startRecording = useCallback(async () => {
    try {
      setApiError(null);
      setSaveStatus(null);
      setRecordedBlob(null);

      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // stop mic tracks
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        setIsRecording(false);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      onSessionStart?.();

      // auto-stop
      if (stopTimeoutRef.current) window.clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = window.setTimeout(() => {
        try {
          recorder.stop();
        } catch {}
      }, Math.max(1, durationSeconds) * 1000);
    } catch (err: any) {
      setApiError(err?.message ?? "Failed to access microphone.");
      setIsRecording(false);
    }
  }, [durationSeconds, onSessionStart]);

  const stopRecording = useCallback(() => {
    try {
      if (stopTimeoutRef.current) window.clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;

      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
    } catch {}
  }, []);

  const discardRecording = useCallback(() => {
    setRecordedBlob(null);
    setApiError(null);
    setSaveStatus(null);
    chunksRef.current = [];
  }, []);

  async function sendToExaminer() {
    if (!recordedBlob) return;

    setApiLoading(true);
    setApiError(null);
    setSaveStatus(null);

    try {
      const formData = new FormData();
      formData.append("audio", recordedBlob, filename);
      formData.append("questionId", String(questionId));
      formData.append("part", part ?? "unknown");

      if (notes && notes.trim()) formData.append("notes", notes.trim());
      if (userId) formData.append("userId", userId);

      if (questionPrompt && questionPrompt.trim()) {
        formData.append("questionPrompt", questionPrompt.trim());
      }

      const url = `/api/speaking/score?pro=${canUsePro ? "true" : "false"}`;

      const res = await fetch(url, { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        setApiError(json?.error ?? "Speaking scoring failed");
        setApiLoading(false);
        return;
      }

      setSaveStatus({
        savedAttempt: !!json?.savedAttempt,
        attemptId: json?.attemptId ?? null,
        saveError: json?.saveError ?? null,
      });

      const score = json?.score as SpeakingScoreJson | undefined;
      const transcript = (json?.transcript ?? null) as string | null;

      if (score) onScore?.({ score, transcript });

      setApiLoading(false);
    } catch (err: any) {
      setApiError(err?.message ?? "Speaking scoring failed");
      setApiLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (stopTimeoutRef.current) window.clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;

      try {
        const rec = mediaRecorderRef.current;
        if (rec && rec.state !== "inactive") rec.stop();
      } catch {}
    };
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">Recorder</div>
        <div className="text-xs text-slate-600">
          {isRecording ? "Recording…" : recordedBlob ? "Recorded" : "Idle"}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            disabled={apiLoading}
          >
            Start recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
          >
            Stop
          </button>
        )}

        <button
          onClick={discardRecording}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          disabled={apiLoading}
        >
          Discard
        </button>

        <button
          onClick={sendToExaminer}
          className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          disabled={!recordedBlob || apiLoading}
        >
          {apiLoading ? "Scoring…" : canUsePro ? "Send to AI examiner (PRO)" : "Send to AI examiner"}
        </button>
      </div>

      {apiError && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
          {apiError}
        </div>
      )}

      {saveStatus && (
        <div
          className={`mt-3 rounded-md border p-2 text-xs ${
            saveStatus.savedAttempt
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {saveStatus.savedAttempt ? (
            <span>
              Saved ✅{" "}
              {saveStatus.attemptId ? `(Attempt ID: ${saveStatus.attemptId})` : ""}
            </span>
          ) : (
            <span>
              Not saved to history ❌{" "}
              {saveStatus.saveError ? `(${saveStatus.saveError})` : ""}
            </span>
          )}
        </div>
      )}

      {recordedBlob && (
        <div className="mt-3">
          <audio controls src={URL.createObjectURL(recordedBlob)} className="w-full" />
        </div>
      )}
    </div>
  );
}
