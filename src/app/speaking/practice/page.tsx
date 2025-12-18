"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useSupabaseSession } from "@/components/SupabaseSessionProvider";
import Timer from "@/components/Timer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpeakingRecorder } from "@/components/speaking/SpeakingRecorder";
import { createClient } from "@/utils/supabase/client";

type PartKey = "part1" | "part2" | "part3";

type SpeakingQuestionRow = {
  id: string;
  part: PartKey;
  prompt: string | null;
  cue_title: string | null;
  cue_points: string[] | null;
  topic: string | null;
  prep_time_sec: number | null;
  speak_time_sec: number | null;
};

function partLabel(part: PartKey) {
  return part === "part1"
    ? "Speaking Part 1"
    : part === "part2"
    ? "Speaking Part 2"
    : "Speaking Part 3";
}

function defaultDurationForPart(part: PartKey): number {
  switch (part) {
    case "part1":
      return 4 * 60;
    case "part2":
      return 3 * 60;
    case "part3":
      return 5 * 60;
    default:
      return 4 * 60;
  }
}

// Your fallback local questions (kept as-is)
const SPEAKING_QUESTIONS: Record<
  PartKey,
  { id: string; title: string; prompt: string; helper?: string }
> = {
  part1: {
    id: "p1-1",
    title: "Part 1 — Work and studies",
    prompt:
      "Let’s talk about work or studies. Do you work, or are you a student? Why did you choose this kind of work or this field of study?",
    helper: "Answer in short, natural sentences as if speaking to an examiner.",
  },
  part2: {
    id: "p2-1",
    title: "Part 2 — Long turn (cue card)",
    prompt:
      "Describe a teacher who has influenced you in your education. You should say:\n\n• who this teacher is\n• what subjects they taught\n• what they did that was special\n\nand explain why this teacher was important to you.",
    helper:
      "You would normally have 1 minute to prepare and up to 2 minutes to talk.",
  },
  part3: {
    id: "p3-1",
    title: "Part 3 — Discussion",
    prompt:
      "In your opinion, how important is it for people to continue learning new things after they finish school? What are some advantages and disadvantages of lifelong learning?",
    helper:
      "Give more developed, analytical answers here, like a discussion with the examiner.",
  },
};

// Self-assessment sliders for Speaking
type SpeakingSelfScores = {
  fluencyCoherence: number;
  lexical: number;
  grammar: number;
  pronunciation: number;
};

type SpeakingPredictionSnapshot = {
  overall: number;
  fluencyCoherence: number;
  lexical: number;
  grammar: number;
  pronunciation: number;
};

type SpeakingAiResultPayload = {
  score: {
    overall_band?: number;
    fluency_coherence?: number;
    lexical_resource?: number;
    grammatical_range_accuracy?: number;
    pronunciation?: number;
    band_explanation_overall?: string;
  };
  transcript: string | null;
};

export default function SpeakingPracticePage() {
  const { session } = useSupabaseSession();
  const userId = (session?.user as any)?.id ?? null;

  const searchParams = useSearchParams();
  const questionId = searchParams.get("question_id");

  const supabase = useMemo(() => createClient(), []);

  // Subscription plan: "free" or "pro" (from Supabase profiles)
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);

  // Part/session controls
  const [part, setPart] = useState<PartKey>("part1");
  const [duration, setDuration] = useState<number>(defaultDurationForPart("part1"));
  const [isRunning, setIsRunning] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [notes, setNotes] = useState("");

  // Bank question load state
  const [bankQuestion, setBankQuestion] = useState<SpeakingQuestionRow | null>(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  // Load DB question if question_id exists
  useEffect(() => {
    let cancelled = false;

    async function loadBankQuestion() {
      if (!questionId) {
        setBankQuestion(null);
        setBankError(null);
        setBankLoading(false);
        return;
      }

      setBankLoading(true);
      setBankError(null);

      const { data, error } = await supabase
        .from("speaking_questions")
        .select("id, part, prompt, cue_title, cue_points, topic, prep_time_sec, speak_time_sec")
        .eq("id", questionId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Failed to load speaking question:", error);
        setBankError("Failed to load question from Supabase.");
        setBankQuestion(null);
        setBankLoading(false);
        return;
      }

      if (!data) {
        setBankError("Question not found (or inactive).");
        setBankQuestion(null);
        setBankLoading(false);
        return;
      }

      const q = data as SpeakingQuestionRow;
      setBankQuestion(q);
      setBankLoading(false);

      // When driven by question bank, sync part + sensible default duration
      setPart(q.part);
      const suggested =
        q.part === "part2"
          ? (q.prep_time_sec ?? 60) + (q.speak_time_sec ?? 120)
          : q.speak_time_sec ?? defaultDurationForPart(q.part);

      setDuration(suggested);
      setIsRunning(false);
      setResetToken((t) => t + 1);
      setNotes("");
    }

    loadBankQuestion();

    return () => {
      cancelled = true;
    };
  }, [questionId, supabase]);

  const handleChangePart = (next: PartKey) => {
    // If user came via question bank link, we keep the part locked to that question.
    if (bankQuestion) return;

    setPart(next);
    const newDuration = defaultDurationForPart(next);
    setDuration(newDuration);
    setIsRunning(false);
    setResetToken((t) => t + 1);
    setNotes("");
  };

  // Display question (bank question overrides static)
  const fallback = useMemo(() => SPEAKING_QUESTIONS[part], [part]);

  const displayTitle = useMemo(() => {
    if (!bankQuestion) return fallback.title;

    if (bankQuestion.part === "part2") {
      return bankQuestion.cue_title || "Part 2 — Long turn (cue card)";
    }

    return bankQuestion.topic
      ? `${partLabel(bankQuestion.part)} — ${bankQuestion.topic}`
      : partLabel(bankQuestion.part);
  }, [bankQuestion, fallback.title]);

  const displayPrompt = useMemo(() => {
    if (!bankQuestion) return fallback.prompt;

    if (bankQuestion.part === "part2") {
      // For Part 2, we render cue card separately; keep prompt as optional intro line
      return bankQuestion.prompt || "";
    }

    return bankQuestion.prompt || "";
  }, [bankQuestion, fallback.prompt]);

  const displayHelper = useMemo(() => {
    if (!bankQuestion) return fallback.helper;

    if (bankQuestion.part === "part2") {
      const prep = bankQuestion.prep_time_sec ?? 60;
      const speak = bankQuestion.speak_time_sec ?? 120;
      return `You normally have ${prep}s to prepare and ${speak}s to speak.`;
    }

    const speak = bankQuestion.speak_time_sec;
    return speak ? `Suggested time: ${speak}s.` : undefined;
  }, [bankQuestion, fallback.helper]);

  const effectiveQuestionId = bankQuestion?.id ?? fallback.id;

  // Self-assessment state
  const [selfScores, setSelfScores] = useState<SpeakingSelfScores>({
    fluencyCoherence: 6,
    lexical: 6,
    grammar: 6,
    pronunciation: 6,
  });
  const [hasPrediction, setHasPrediction] = useState(false);
  const [predictionLocked, setPredictionLocked] = useState(false);

  const [predictionSnapshot, setPredictionSnapshot] =
    useState<SpeakingPredictionSnapshot | null>(null);

  const [aiResult, setAiResult] = useState<SpeakingAiResultPayload | null>(null);

  const livePredictedOverall = useMemo(() => {
    const avg =
      (selfScores.fluencyCoherence +
        selfScores.lexical +
        selfScores.grammar +
        selfScores.pronunciation) / 4;
    return Math.round(avg * 2) / 2;
  }, [selfScores]);

  // Load subscription plan so we can gate Pro scoring
  useEffect(() => {
    if (!userId) {
      setPlan("free");
      setIsPro(false);
      return;
    }

    let cancelled = false;

    async function fetchPlan() {
      try {
        setPlanLoading(true);
        setPlanError(null);

        const res = await fetch("/api/profile/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        const json = await res.json();

        if (!res.ok || json.error) {
          if (cancelled) return;
          setPlan("free");
          setIsPro(false);
          setPlanError(json.error || "Failed to load plan.");
          return;
        }

        if (cancelled) return;

        const rawPlan = (json.profile?.plan ?? "").toString().toLowerCase();
        const apiPlan = rawPlan === "pro" ? "pro" : "free";
        setPlan(apiPlan);

        if (apiPlan !== "pro") {
          setIsPro(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load plan (speaking):", err);
          setPlan("free");
          setIsPro(false);
          setPlanError("Failed to load plan.");
        }
      } finally {
        if (!cancelled) {
          setPlanLoading(false);
        }
      }
    }

    fetchPlan();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <main className="min-h-dvh bg-white text-slate-900 p-6">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">IELTS Speaking Practice (beta)</h1>
            <p className="mt-1 text-xs text-slate-500">
              Choose a part, start the timer, and answer out loud as if you were
              in the real exam. Use the text box only for brief notes if you wish.
            </p>
          </div>
        </header>

        {/* View progress link */}
        {userId && (
          <div className="flex justify-end">
            <Link
              href="/speaking/progress"
              className="text-xs text-slate-500 underline-offset-2 hover:underline"
            >
              View your speaking progress →
            </Link>
          </div>
        )}

        {/* Config card */}
        <Card className="space-y-4 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Part selector */}
            <div className="space-y-2">
              <Label>Speaking part</Label>
              <Select
                value={part}
                onValueChange={(v) => handleChangePart(v as PartKey)}
                disabled={!!bankQuestion} // lock when driven by question_id
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="part1">Part 1 — Introduction</SelectItem>
                  <SelectItem value="part2">Part 2 — Long turn</SelectItem>
                  <SelectItem value="part3">Part 3 — Discussion</SelectItem>
                </SelectContent>
              </Select>
              {bankQuestion && (
                <p className="text-[11px] text-slate-500">
                  Loaded from question bank (part locked).
                </p>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={String(duration)}
                onValueChange={(v) => {
                  setDuration(Number(v));
                  setIsRunning(false);
                  setResetToken((t) => t + 1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(4 * 60)}>4 minutes (short session)</SelectItem>
                  <SelectItem value={String(6 * 60)}>6 minutes (extended)</SelectItem>
                  <SelectItem value={String(8 * 60)}>8 minutes (intense)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions row (sits under Part + Duration) */}
            <div className="md:col-span-1 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRunning((r) => !r)}
                >
                  {isRunning ? "Pause session" : "Start session"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsRunning(false);
                    setResetToken((t) => t + 1);
                  }}
                >
                  Reset timer
                </Button>
              </div>

              {/* Pro speaking scoring toggle */}
              <div className="flex flex-col gap-1 text-xs text-slate-600">
                <label
                  className={`flex flex-col gap-1 ${!userId || plan !== "pro" ? "cursor-not-allowed opacity-60" : ""
                    }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={isPro}
                      disabled={!userId || plan !== "pro" || planLoading}
                      onChange={(e) => setIsPro(e.target.checked)}
                    />
                    <span>
                      Use <span className="font-semibold">Pro speaking scoring</span> (gpt-4o)
                    </span>
                  </span>

                  <span className="text-[10px] text-slate-500">
                    {planLoading && "Checking your plan…"}
                    {!planLoading && (!userId || plan !== "pro") && (
                      <>Sign in and upgrade to Pro to unlock GPT-4o speaking scoring.</>
                    )}
                    {!planLoading && userId && plan === "pro" && (
                      <>Pro active — GPT-4o will analyse your answers.</>
                    )}
                  </span>

                  {planError && (
                    <span className="text-[10px] text-red-500">{planError}</span>
                  )}
                </label>
              </div>
            </div>

            {/* Timer + Pro toggle */}
            <div className="flex flex-col justify-between gap-2">
              <div className="flex flex-col items-start gap-1">
                <Timer
                  key={`${part}-${duration}-${resetToken}`}
                  initialSeconds={duration}
                  isRunning={isRunning}
                  onComplete={() => setIsRunning(false)}
                />
                <p className="text-[11px] text-slate-500">
                  Try to keep speaking until the timer finishes.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Model summary */}
        <p className="text-xs text-slate-500">
          Speaking scoring model:{" "}
          {isPro
            ? "Pro (gpt-4o – full examiner-style depth for serious practice)."
            : "Free (gpt-4o-mini – accurate everyday examiner-style practice)."}{" "}
          Current plan: <span className="font-semibold uppercase">{plan}</span>.
        </p>

        {/* Bank loading/errors */}
        {bankLoading && (
          <Card className="p-4 text-sm text-slate-600">Loading question…</Card>
        )}
        {bankError && <Card className="p-4 text-sm text-red-600">{bankError}</Card>}

        {/* Question + recorder + notes */}
        {!bankLoading && !bankError && (
          <Card className="space-y-4 p-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
                <span className="rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-700">
                  {displayTitle}
                </span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">
                  IELTS Speaking
                </span>
              </div>

              {/* Part 2 cue card rendering */}
              {bankQuestion?.part === "part2" ? (
                <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                  {displayPrompt && (
                    <div className="mb-2 whitespace-pre-line">{displayPrompt}</div>
                  )}

                  {Array.isArray(bankQuestion.cue_points) &&
                    bankQuestion.cue_points.length > 0 && (
                      <ul className="list-disc pl-5">
                        {bankQuestion.cue_points.map((p, idx) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    )}
                </div>
              ) : (
                <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-line">
                  {displayPrompt}
                </div>
              )}

              {displayHelper && (
                <p className="text-[11px] text-slate-500">{displayHelper}</p>
              )}
            </div>

            <SpeakingRecorder
              userId={userId}
              part={part}
              questionId={effectiveQuestionId}
              questionPrompt={displayPrompt}
              durationSeconds={duration}
              notes={notes}
              isPro={isPro}
              onSessionStart={() => setIsRunning(true)}
              onScore={(payload) => {
                setAiResult(payload);

                if (hasPrediction) {
                  setPredictionSnapshot({
                    overall: livePredictedOverall,
                    fluencyCoherence: selfScores.fluencyCoherence,
                    lexical: selfScores.lexical,
                    grammar: selfScores.grammar,
                    pronunciation: selfScores.pronunciation,
                  });
                  setPredictionLocked(true);
                } else {
                  setPredictionSnapshot(null);
                  setPredictionLocked(false);
                }
              }}
            />

            <div className="space-y-2">
              <Label htmlFor="notes">Optional notes or typed answer (for self-review)</Label>
              <textarea
                id="notes"
                className="min-h-[140px] w-full rounded-md border border-slate-200 bg-white p-3 text-sm outline-none focus:border-slate-400 focus:ring-0"
                placeholder="You can jot down key words, structure, or even type your answer after speaking."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <p className="text-[11px] text-slate-500">
                In the real exam you speak, not type. Use this box only if it helps your reflection.
              </p>
            </div>
          </Card>
        )}

        {/* SELF-ASSESSMENT CARD */}
        <Card className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Self-assessment (optional)</h2>
              <p className="text-xs text-slate-500">
                Use the sliders to predict your Speaking band after you answer.
                Your prediction will be compared with the AI examiner score for this attempt.
              </p>
            </div>
            {predictionLocked ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                Prediction locked
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  if (!hasPrediction) return;
                  setPredictionLocked(true);
                  setPredictionSnapshot({
                    overall: livePredictedOverall,
                    fluencyCoherence: selfScores.fluencyCoherence,
                    lexical: selfScores.lexical,
                    grammar: selfScores.grammar,
                    pronunciation: selfScores.pronunciation,
                  });
                }}
                disabled={!hasPrediction}
              >
                Lock prediction
              </Button>
            )}
          </div>

          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <p className="text-xs uppercase text-slate-500">
              Your predicted overall Speaking band
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-semibold">
                {hasPrediction ? livePredictedOverall.toFixed(1) : "—"}
              </span>
              <span className="text-xs text-slate-500">
                Move the sliders below to set your guess.
              </span>
            </div>
          </div>

          <div className="space-y-4 text-sm">
            {[
              { key: "fluencyCoherence", label: "Fluency & Coherence" },
              { key: "lexical", label: "Lexical Resource" },
              { key: "grammar", label: "Grammatical Range & Accuracy" },
              { key: "pronunciation", label: "Pronunciation" },
            ].map((row) => (
              <div key={row.key}>
                <div className="flex items-center justify-between">
                  <Label>{row.label}</Label>
                  <span className="text-xs text-slate-500">
                    Band {(selfScores as any)[row.key].toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={9}
                  step={0.5}
                  disabled={predictionLocked}
                  value={(selfScores as any)[row.key]}
                  onChange={(e) => {
                    setHasPrediction(true);
                    const val = parseFloat(e.target.value);
                    setSelfScores((prev) => ({ ...prev, [row.key]: val } as any));
                  }}
                  className="mt-2 w-full"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* BAND SCORE RESULTS */}
        {aiResult && (
          <Card className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Band Score Results</h2>
                <p className="text-xs text-slate-500">
                  Comparison of your prediction with the AI examiner&apos;s band for this answer.
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>
                  Model:{" "}
                  <span className="font-medium">
                    {isPro ? "Pro (gpt-4o)" : "Free (gpt-4o-mini)"}
                  </span>
                </p>
                <p>
                  Plan: <span className="font-medium uppercase">{plan}</span>
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-[11px] uppercase text-slate-500">
                  Your predicted overall band
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold">
                    {predictionSnapshot ? predictionSnapshot.overall.toFixed(1) : "—"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {predictionSnapshot
                      ? "Prediction locked for this attempt."
                      : "No prediction recorded for this attempt."}
                  </span>
                </div>
              </div>

              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-[11px] uppercase text-slate-500">
                  AI examiner overall band
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold">
                    {typeof aiResult.score.overall_band === "number"
                      ? aiResult.score.overall_band.toFixed(1)
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border border-slate-200">
              <table className="min-w-full border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Criterion</th>
                    <th className="px-3 py-2 text-left font-medium">Your prediction</th>
                    <th className="px-3 py-2 text-left font-medium">AI examiner band</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { key: "fluencyCoherence", label: "Fluency & Coherence", aiKey: "fluency_coherence" },
                    { key: "lexical", label: "Lexical Resource", aiKey: "lexical_resource" },
                    { key: "grammar", label: "Grammatical Range & Accuracy", aiKey: "grammatical_range_accuracy" },
                    { key: "pronunciation", label: "Pronunciation", aiKey: "pronunciation" },
                  ].map((row) => (
                    <tr key={row.key}>
                      <td className="px-3 py-2 align-top text-slate-700">{row.label}</td>
                      <td className="px-3 py-2 align-top text-slate-700">
                        {predictionSnapshot ? (predictionSnapshot as any)[row.key]?.toFixed?.(1) ?? "—" : "—"}
                      </td>
                      <td className="px-3 py-2 align-top text-slate-700">
                        {typeof (aiResult.score as any)[row.aiKey] === "number"
                          ? (aiResult.score as any)[row.aiKey].toFixed(1)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {aiResult.score.band_explanation_overall && (
              <div className="space-y-1 text-xs text-slate-700">
                <p className="text-[11px] font-semibold uppercase text-slate-500">
                  Examiner summary
                </p>
                <p>{aiResult.score.band_explanation_overall}</p>
              </div>
            )}

            {aiResult.transcript && (
              <div className="space-y-1 text-xs text-slate-700">
                <p className="text-[11px] font-semibold uppercase text-slate-500">
                  Transcript (approximate)
                </p>
                <p className="whitespace-pre-line">{aiResult.transcript}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="text-xs" onClick={() => setAiResult(null)}>
                Hide feedback
              </Button>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
