"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import { useSupabaseSession } from "@/components/SupabaseSessionProvider";
import { Card } from "@/components/ui/card";

function pretty(obj: unknown) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function safeDateLabel(iso: any) {
  try {
    return iso ? new Date(iso).toLocaleString() : "—";
  } catch {
    return "—";
  }
}

/**
 * Your speaking question_id looks like "p1-1" / "p2-1" / "p3-9"
 * We'll turn that into a professional label: Part 1 • Q1
 */
function parseSpeakingQuestionId(questionId: string | null | undefined) {
  const raw = (questionId ?? "").trim();
  const m = raw.match(/^p([123])-(\d+)$/i);
  if (!m) return { partLabel: null as string | null, qLabel: raw ? `Q ${raw}` : null };

  const partNum = Number(m[1]);
  const qNum = Number(m[2]);

  const partLabel = `Part ${partNum}`;
  const qLabel = `Q${qNum}`;
  return { partLabel, qLabel };
}

/**
 * IELTS Speaking doesn’t have Academic/General like Writing does.
 * But you asked for a "professional naming" pattern like:
 * "Academic - Part 1 - Q5" / "General - Part 3 - Q9".
 *
 * For Speaking we’ll use: "Speaking - Part X - QY"
 * If you *really* want “General” here for consistency, switch moduleLabel below.
 */
function buildSpeakingDisplayTitle(questionId: string | null | undefined) {
  const moduleLabel = "Speaking"; // or "General" if you want visual consistency
  const { partLabel, qLabel } = parseSpeakingQuestionId(questionId);

  // fallback if parsing fails
  if (!partLabel || !qLabel) return moduleLabel;

  return `${moduleLabel} • ${partLabel} • ${qLabel}`;
}

function numOrNull(v: any): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

export default function SpeakingAttemptDetailPage() {
  const params = useParams<{ id: string }>();
  const attemptId = params?.id;

  const { session } = useSupabaseSession();
  const userId = (session?.user as any)?.id ?? null;

  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!userId || !attemptId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/speaking/attempts?userId=${encodeURIComponent(userId)}&id=${encodeURIComponent(attemptId)}`,
        { cache: "no-store" }
      );
      const json = await res.json();

      if (!res.ok || json.error) throw new Error(json.error || "Failed to load attempt");
      const attempt = (json.attempts ?? [])[0];
      if (!attempt) throw new Error("Attempt not found");

      setRow(attempt);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load attempt");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, attemptId]);

  // --- canonical-ish derived fields to match Writing meta block ---
  const createdAtLabel = safeDateLabel(row?.created_at);

  const displayTitle = useMemo(
    () => buildSpeakingDisplayTitle(row?.question_id),
    [row?.question_id]
  );

  // Module / Task / Prompt fields (Writing has these stored; Speaking currently doesn’t)
  const moduleLabel = "Speaking"; // choose "General" if you want that exact vibe everywhere
  const taskLabel = (() => {
    const { partLabel } = parseSpeakingQuestionId(row?.question_id);
    // Prefer parsed part label; fallback to stored `part`
    if (partLabel) return partLabel;
    if (row?.part) {
      // row.part might be "part1" etc
      const m = String(row.part).match(/^part([123])$/i);
      return m ? `Part ${m[1]}` : String(row.part);
    }
    return "—";
  })();

  // Where to get prompt from *today* (without DB changes):
  // 1) If you later store it in speaking_attempts.question_prompt, use that
  // 2) Or store it inside score_json.question_prompt
  // For now: show placeholder if missing
  const questionPrompt =
    row?.question_prompt ??
    row?.score_json?.question_prompt ??
    row?.score_json?.prompt ??
    null;

  // scores
  const score = useMemo(() => {
    const sj = row?.score_json ?? {};
    return (sj?.score ?? sj) as any;
  }, [row]);

  const overall = numOrNull(row?.overall_band ?? score?.overall_band);
  const fluency = numOrNull(score?.fluency_coherence ?? score?.fluency);
  const lexical = numOrNull(score?.lexical_resource ?? score?.lexical);
  const grammar = numOrNull(score?.grammatical_range_accuracy ?? score?.grammar);
  const pronunciation = numOrNull(score?.pronunciation);

  const overview =
    score?.band_explanation_overall ??
    score?.examiner_summary ??
    score?.long_feedback_overall ??
    "";

  const advice =
    (Array.isArray(score?.improvement_tips) ? score.improvement_tips.join(" ") : "") ||
    score?.overall_advice ||
    "";

  const hasBandData =
    overall !== null || fluency !== null || lexical !== null || grammar !== null || pronunciation !== null;

  return (
    <PageShell className="bg-white text-slate-900">
      {/* HEADER (verbatim pattern) */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Attempt details</h1>
          <p className="mt-1 text-xs text-slate-500">
            Review your transcript and AI feedback for this attempt.
          </p>
        </div>
        <Link href="/speaking/attempts" className="text-xs text-blue-600 hover:underline">
          ← Back to attempts
        </Link>
      </header>

      {!userId && (
        <Card className="mt-4 p-4 text-sm text-slate-600">
          You need to be signed in to view this attempt.
        </Card>
      )}

      {error && (
        <Card className="mt-4 border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </Card>
      )}

      {loading && (
        <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-600">
          Loading attempt…
        </div>
      )}

      {/* CONTEXT BANNER like Writing */}
      {row && (
        <section className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-800">{displayTitle}</p>
            </div>

            <Link
              href="/speaking/practice"
              className="text-[11px] font-semibold text-emerald-700 hover:underline"
            >
              Practice again →
            </Link>
          </div>
        </section>
      )}

      {/* META BLOCK — now matches Writing fields */}
      {row && (
        <section className="mt-4 space-y-2 text-sm">
          <p className="text-slate-600">
            <span className="font-medium">Attempt ID:</span> {row.id}
          </p>
          <p className="text-slate-600">
            <span className="font-medium">Question ID:</span> {row.question_id ?? "—"}
          </p>
          <p className="text-slate-600">
            <span className="font-medium">Module:</span> {moduleLabel}
          </p>
          <p className="text-slate-600">
            <span className="font-medium">Task:</span> {taskLabel}
          </p>
          <p className="text-slate-600">
            <span className="font-medium">Question prompt:</span>{" "}
            {questionPrompt ? (
              <span className="text-slate-700">{questionPrompt}</span>
            ) : (
              <span className="text-slate-400">
                Not stored yet (we’ll fix this next so it shows for all new attempts).
              </span>
            )}
          </p>
          <p className="text-slate-600">
            <span className="font-medium">Created at:</span> {createdAtLabel}
          </p>
        </section>
      )}

      {/* AI BAND SCORES */}
      {row && hasBandData && (
        <section className="mt-6 space-y-3">
          <div>
            <h2 className="text-lg font-semibold">AI band scores</h2>
            <p className="mt-1 text-xs text-slate-500">
              These scores come from the AI examiner for this attempt.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Overall band</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold">{overall !== null ? overall.toFixed(1) : "—"}</span>
            </div>
            {overview && (
              <p className="mt-2 text-xs text-slate-600 whitespace-pre-wrap">{overview}</p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <ScoreCard label="Fluency & coherence" value={fluency} />
            <ScoreCard label="Lexical resource" value={lexical} />
            <ScoreCard label="Grammar range & accuracy" value={grammar} />
            <ScoreCard label="Pronunciation" value={pronunciation} />
          </div>

          {advice && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="mb-1 font-semibold uppercase text-amber-800">Overall advice</p>
              <p>{advice}</p>
            </div>
          )}
        </section>
      )}

      {/* TRANSCRIPT */}
      {row && (
        <section className="mt-6 space-y-3">
          <h2 className="text-lg font-semibold">Your transcript</h2>
          <div className="whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm text-slate-800">
            {row.transcript ?? "No transcript stored for this attempt."}
          </div>
        </section>
      )}
    </PageShell>
  );
}

function ScoreCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value !== null ? value.toFixed(1) : "—"}</p>
    </div>
  );
}
