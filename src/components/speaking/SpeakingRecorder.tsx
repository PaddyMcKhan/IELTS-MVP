"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type PartKey = "part1" | "part2" | "part3" | "unknown";

export type RecorderStatus = "idle" | "recording" | "finished" | "submitting";

export type SpeakingScoreJson = {
  overall_band: number;
  fluency_coherence: number;
  lexical_resource: number;
  grammatical_range_accuracy: number;
  pronunciation: number;
  estimated_words?: number;
  estimated_duration_seconds?: number;
  band_explanation_overall?: string;
  strengths?: string[];
  weaknesses?: string[];
  improvement_tips?: string[];
  long_feedback_overall?: string;
  long_feedback_fluency_coherence?: string;
  long_feedback_lexical_resource?: string;
  long_feedback_grammar_pronunciation?: string;
};

interface SpeakingRecorderProps {
  part: PartKey;
  questionId: string;
  questionPrompt?: string | null; // ✅ NEW (for attempt details + bank parity)
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
  questionPrompt, // ✅ NEW
  durationSeconds,
  notes,
  userId,
  isPro,
  onSessionStart,
  onScore,
}: SpeakingRecorderProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [score, setScore] = useState<SpeakingScoreJson | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastBlobRef = useRef<Blob | null>(null);

  // Detect support in browser
  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window.MediaRecorder !== "undefined";
    setIsSupported(supported);
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    setElapsedSeconds(0);

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= durationSeconds) {
          // Auto-stop when time is up
          if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
          }
          stopTimer();
        }
        return next;
      });
    }, 1000);

    timerRef.current = timer;
  };

  const startRecording = async () => {
    if (!isSupported || status === "recording") return;

    setError(null);
    setApiError(null);
    setScore(null);
    setTranscript(null);

    // Clear previous audio
    setAudioUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    lastBlobRef.current = null;
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stopTimer();
        stopStream();

        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        lastBlobRef.current = blob;

        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setStatus("finished");
      };

      recorder.start();
      setStatus("recording");
      startTimer();
      onSessionStart?.();
    } catch (err: any) {
      console.error("Error starting recording:", err);
      setError(
        "Could not access your microphone. Please check browser permissions and try again."
      );
      setStatus("idle");
      stopStream();
      stopTimer();
    }
  };

  const discardRecording = () => {
    stopTimer();
    stopStream();

    setStatus("idle");
    setScore(null);
    setTranscript(null);
    setApiError(null);

    setAudioUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    lastBlobRef.current = null;
    chunksRef.current = [];
  };

  const sendToExaminer = async () => {
    if (!lastBlobRef.current) {
      setApiError("Please record and preview your answer first.");
      return;
    }

    setStatus("submitting");
    setApiError(null);
    setScore(null);
    setTranscript(null);

    try {
      const blob = lastBlobRef.current;
      const formData = new FormData();

      // Decide a file extension that matches the Blob's mime type
      const type = blob.type || "";
      let extension = "webm";
      if (type.includes("ogg")) extension = "ogg";
      else if (type.includes("wav")) extension = "wav";
      else if (type.includes("mpeg") || type.includes("mp3")) extension = "mp3";
      else if (type.includes("m4a")) extension = "m4a";

      const filename = `answer.${extension}`;

      formData.append("audio", blob, filename);
      formData.append("questionId", String(questionId));
      formData.append("part", part ?? "unknown");

      if (questionPrompt && questionPrompt.trim()) {
        formData.append("questionPrompt", questionPrompt.trim());
      }

      if (userId) {
        formData.append("userId", userId);
      }
      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }

      const url = isPro ? "/api/speaking/score?pro=true" : "/api/speaking/score";

      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      // Accept both shapes:
      // - old: { score, transcript }
      // - new: { score_json, transcript }
      const scoreJson: SpeakingScoreJson | null =
        (json?.score_json as SpeakingScoreJson | undefined) ??
        (json?.score as SpeakingScoreJson | undefined) ??
        null;

      const transcriptText: string | null =
        typeof json?.transcript === "string" ? json.transcript : null;

      // If examiner returns "no valid speech" it can be: score_json: null
      // We treat that as finished, but show a friendly message.
      if (!scoreJson) {
        setScore(null);
        setTranscript(transcriptText);
        setApiError(
          json?.reason ||
            "Received an unexpected response from the AI examiner. Please try again."
        );
        setStatus("finished");
        return;
      }

      setApiError(null);
      setScore(scoreJson);
      setTranscript(transcriptText);
      setStatus("finished");

      // ✅ Save the attempt to Supabase (Writing-style: score-only route + save-only route)
      try {
        if (!userId) {
          console.warn("No userId; skipping speaking attempt save.");
        } else {
          const saveRes = await fetch("/api/speaking/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              part,
              duration_seconds: durationSeconds,
              transcript: transcriptText ?? "",
              question_id: String(questionId),          // matches your current table usage
              question_prompt: questionPrompt ?? null,  // snapshot (optional)
              score_json: scoreJson,
              overall_band: scoreJson.overall_band,
              model: json?.model ?? (isPro ? "gpt-4o" : "gpt-4o-mini"),
              isPro,
              audio_path: "inline-openai",
            }),
          });

          const saveJson = await saveRes.json().catch(() => ({}));

          if (!saveRes.ok) {
            console.error("Failed to save speaking attempt:", saveRes.status, saveJson);
            setApiError(
              saveJson?.error ||
              `Scored successfully, but failed to save attempt (HTTP ${saveRes.status}).`
            );
          } else {
            console.log("Speaking attempt saved:", saveJson?.attempt?.id ?? saveJson);
          }
        }
      } catch (e) {
        console.error("Unexpected error saving speaking attempt:", e);
        setApiError("Scored successfully, but saving the attempt failed unexpectedly.");
      }

      // Notify parent page so it can render the big comparison card
      onScore?.({
        score: scoreJson,
        transcript: transcriptText,
      });
    } catch (err: any) {
      console.error("Error calling /api/speaking/score:", err);
      setApiError(
        "Something went wrong while contacting the AI examiner. Please try again."
      );
      setStatus("finished");
    }
  };

  const toggleRecording = () => {
    if (status === "recording") {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      stopTimer();
      return;
    }

    startRecording();
  };

  const formattedTime = `${String(Math.floor(elapsedSeconds / 60)).padStart(
    2,
    "0"
  )}:${String(elapsedSeconds % 60).padStart(2, "0")}`;

  const partLabel =
    part === "part1" ? "1" : part === "part2" ? "2" : part === "part3" ? "3" : "?";

  const overallDisplay =
    score && typeof score.overall_band === "number"
      ? score.overall_band.toFixed(1)
      : null;

  if (!isSupported) {
    return (
      <Card className="space-y-2 p-4">
        <p className="text-sm font-semibold text-slate-900">AI Examiner Recorder</p>
        <p className="text-xs text-slate-600">
          Audio recording is not supported in this browser. Please try again in a modern
          desktop browser that supports MediaRecorder.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">AI Examiner Recorder</p>
          <p className="text-[11px] text-slate-500">
            Record your answer, listen back, then send it to the AI examiner for a band
            score and feedback. Your notes stay private to you.
          </p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
          Part {partLabel}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              status === "recording"
                ? "bg-red-500"
                : status === "submitting"
                ? "bg-amber-500"
                : "bg-slate-300"
            }`}
          />
          <span>
            {status === "recording"
              ? "Recording…"
              : status === "finished"
              ? "Recording finished"
              : status === "submitting"
              ? "Sending to AI examiner…"
              : "Ready to record"}
          </span>
        </div>
        <span className="font-mono text-slate-700">
          {formattedTime} / {String(Math.floor(durationSeconds / 60)).padStart(2, "0")}:
          {String(durationSeconds % 60).padStart(2, "0")}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={status === "recording" ? "destructive" : "default"}
          onClick={toggleRecording}
          disabled={status === "submitting"}
        >
          {status === "recording" ? "Stop recording" : "Start recording"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={discardRecording}
          disabled={status === "recording" || status === "submitting"}
        >
          Discard / reset
        </Button>

        <Button
          size="sm"
          onClick={sendToExaminer}
          disabled={
            status === "recording" ||
            status === "submitting" ||
            !audioUrl ||
            !lastBlobRef.current
          }
        >
          Send to AI examiner
        </Button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {apiError && <p className="text-xs text-red-600">{apiError}</p>}

      {/* Local playback */}
      {audioUrl && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-slate-600">
            Playback of your answer (local). Once you send it, the audio is uploaded
            securely and analysed by the AI examiner.
          </p>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}

      {/* Mini AI feedback card */}
      {score && (
        <div className="space-y-3 rounded-md border border-slate-200 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase text-slate-500">
                Overall Speaking Band
              </p>
              <p className="text-3xl font-semibold">{overallDisplay ?? "—"}</p>
            </div>
            <div className="text-[11px] text-slate-600">
              <p>
                Fluency &amp; Coherence:{" "}
                <span className="font-medium">
                  {score.fluency_coherence?.toFixed?.(1) ?? score.fluency_coherence}
                </span>
              </p>
              <p>
                Lexical Resource:{" "}
                <span className="font-medium">
                  {score.lexical_resource?.toFixed?.(1) ?? score.lexical_resource}
                </span>
              </p>
              <p>
                Grammar Range &amp; Accuracy:{" "}
                <span className="font-medium">
                  {score.grammatical_range_accuracy?.toFixed?.(1) ??
                    score.grammatical_range_accuracy}
                </span>
              </p>
              <p>
                Pronunciation:{" "}
                <span className="font-medium">
                  {score.pronunciation?.toFixed?.(1) ?? score.pronunciation}
                </span>
              </p>
            </div>
          </div>

          {score.band_explanation_overall && (
            <div className="space-y-1 text-[11px] text-slate-700">
              <p className="font-semibold uppercase text-slate-500">Examiner summary</p>
              <p>{score.band_explanation_overall}</p>
            </div>
          )}

          {transcript && (
            <div className="space-y-1 text-[11px] text-slate-700">
              <p className="font-semibold uppercase text-slate-500">
                Transcript (approximate)
              </p>
              <p className="whitespace-pre-line">{transcript}</p>
            </div>
          )}

          <p className="text-[10px] text-slate-400">
            Your notes ({notes.length} characters) are{" "}
            <span className="font-semibold">not</span> sent to the AI examiner. They&apos;re
            only for your own reflection on the practice page.
          </p>
        </div>
      )}

      {!score && (
        <p className="text-[10px] text-slate-400">
          Your notes ({notes.length} characters) are{" "}
          <span className="font-semibold">not</span> sent to the AI examiner. They&apos;re
          only for your own reflection on the practice page.
        </p>
      )}
    </Card>
  );
}
