//src/app/progress/speaking/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSupabaseSession } from "@/components/SupabaseSessionProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type SpeakingAttemptRow = {
  id: string;
  user_id: string | null;
  question_id: string | null; // e.g. "p1-1"
  part?: string | null; // "part1" | "part2" | "part3" (sometimes present)
  transcript?: string | null;
  score_json: any;
  created_at: string;
  overall_band?: number | null;
};

type PartKey = "part1" | "part2" | "part3";

const partLabels: Record<PartKey, string> = {
  part1: "Part 1",
  part2: "Part 2",
  part3: "Part 3",
};

type CriterionKey = "fluency" | "lexical" | "grammar" | "pronunciation";

const criterionLabels: Record<CriterionKey, string> = {
  fluency: "Fluency & coherence",
  lexical: "Lexical resource",
  grammar: "Grammar range & accuracy",
  pronunciation: "Pronunciation",
};

function parsePartFromQuestionId(questionId?: string | null): PartKey | null {
  // expects "p1-1" / "p2-3" / "p3-9"
  if (!questionId) return null;
  const m = questionId.match(/^p([123])-\d+$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (n === 1) return "part1";
  if (n === 2) return "part2";
  if (n === 3) return "part3";
  return null;
}

function parseQuestionNumber(questionId?: string | null): string | null {
  if (!questionId) return null;
  const m = questionId.match(/^p[123]-(\d+)$/i);
  return m ? m[1] : null;
}

function safeScoreObj(row: SpeakingAttemptRow) {
  const sj = (row as any)?.score_json ?? {};
  // sometimes stored as { score: {...} } – be defensive
  const s = sj?.score && typeof sj.score === "object" ? sj.score : sj;
  return s ?? {};
}

function getOverall(row: SpeakingAttemptRow): number | null {
  const s = safeScoreObj(row);
  // prefer score_json.overall_band, then column overall_band
  if (typeof s?.overall_band === "number") return s.overall_band;
  if (typeof (row as any)?.overall_band === "number") return (row as any).overall_band;
  return null;
}

export default function SpeakingProgressPage() {
  const { session, supabase } = useSupabaseSession();
  const userId = (session?.user as any)?.id ?? null;

  const [attempts, setAttempts] = useState<SpeakingAttemptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [plan, setPlan] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Load attempts (same pattern as Writing Progress)
  useEffect(() => {
    if (!userId) return;

    async function loadAttempts() {
      setLoading(true);
      setError(null);
      try {
        const q = `?userId=${encodeURIComponent(userId)}`;
        const res = await fetch(`/api/speaking/attempts${q}`);
        const json = await res.json();

        if (!res.ok || json.error) {
          setError(json.error || "Failed to load speaking attempts");
          return;
        }

        setAttempts(json.attempts ?? []);
      } catch (err) {
        console.error("Failed to load speaking attempts:", err);
        setError("Failed to load speaking attempts");
      } finally {
        setLoading(false);
      }
    }

    loadAttempts();
  }, [userId]);

  // Load profile plan (PRO gating) — same pattern as Writing Progress
  useEffect(() => {
    if (!supabase || !userId) return;

    async function loadProfile() {
      try {
        setProfileLoading(true);
        const { data, error } = await supabase
          .from("user_profiles")
          .select("plan")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) {
          console.error("Speaking progress page profile load error:", error);
          return;
        }

        setPlan((data as any)?.plan ?? null);
      } catch (err) {
        console.error("Unexpected error loading profile for speaking progress:", err);
      } finally {
        setProfileLoading(false);
      }
    }

    loadProfile();
  }, [supabase, userId]);

  const isPro = (plan ?? "").toUpperCase() === "PRO";

  // Sort newest first (same as Writing)
  const sortedAttempts = useMemo(() => {
    if (!attempts || attempts.length === 0) return [];
    return [...attempts].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return db - da;
    });
  }, [attempts]);

  // Overall snapshot (same “shape” as Writing)
  const progressSummary = useMemo(() => {
    if (!sortedAttempts.length) return null;

    const overallScores: number[] = [];
    for (const att of sortedAttempts) {
      const overall = getOverall(att);
      if (typeof overall === "number") overallScores.push(overall);
    }

    const totalAttempts = sortedAttempts.length;
    const scoredAttempts = overallScores.length;

    if (scoredAttempts === 0) {
      return {
        totalAttempts,
        scoredAttempts,
        bestOverall: null as number | null,
        averageOverall: null as number | null,
        lastOverall: null as number | null,
      };
    }

    const bestOverall = Math.max(...overallScores);
    const averageOverall = overallScores.reduce((s, v) => s + v, 0) / scoredAttempts;
    const lastOverall = overallScores[0]; // newest first

    return { totalAttempts, scoredAttempts, bestOverall, averageOverall, lastOverall };
  }, [sortedAttempts]);

  // Breakdown by speaking part (Part 1 / 2 / 3)
  const partSummary = useMemo(() => {
    const base: Record<PartKey, { count: number; sum: number; average: number | null }> = {
      part1: { count: 0, sum: 0, average: null },
      part2: { count: 0, sum: 0, average: null },
      part3: { count: 0, sum: 0, average: null },
    };

    for (const att of sortedAttempts) {
      const overall = getOverall(att);
      if (typeof overall !== "number") continue;

      const partKey =
        (att.part as PartKey | null) ??
        parsePartFromQuestionId(att.question_id) ??
        null;

      if (!partKey) continue;
      if (!(partKey in base)) continue;

      base[partKey].count += 1;
      base[partKey].sum += overall;
    }

    (Object.keys(base) as PartKey[]).forEach((k) => {
      const c = base[k];
      c.average = c.count > 0 ? c.sum / c.count : null;
    });

    return base;
  }, [sortedAttempts]);

  // Criterion averages (Speaking)
  const criterionSummary = useMemo(() => {
    const base: Record<CriterionKey, { count: number; sum: number; average: number | null }> = {
      fluency: { count: 0, sum: 0, average: null },
      lexical: { count: 0, sum: 0, average: null },
      grammar: { count: 0, sum: 0, average: null },
      pronunciation: { count: 0, sum: 0, average: null },
    };

    for (const att of sortedAttempts) {
      const s = safeScoreObj(att);

      if (typeof s.fluency_coherence === "number") {
        base.fluency.count += 1;
        base.fluency.sum += s.fluency_coherence;
      }
      if (typeof s.lexical_resource === "number") {
        base.lexical.count += 1;
        base.lexical.sum += s.lexical_resource;
      }
      if (typeof s.grammatical_range_accuracy === "number") {
        base.grammar.count += 1;
        base.grammar.sum += s.grammatical_range_accuracy;
      }
      if (typeof s.pronunciation === "number") {
        base.pronunciation.count += 1;
        base.pronunciation.sum += s.pronunciation;
      }
    }

    (Object.keys(base) as CriterionKey[]).forEach((k) => {
      const c = base[k];
      c.average = c.count > 0 ? c.sum / c.count : null;
    });

    return base;
  }, [sortedAttempts]);

  // Last 5 for listing
  const recentAttempts = useMemo(() => sortedAttempts.slice(0, 5), [sortedAttempts]);

  // Most common weaknesses trend (top 5)
  const weaknessTrend = useMemo(() => {
    const map = new Map<string, number>();

    for (const att of sortedAttempts) {
      const s = safeScoreObj(att);
      const weaknesses: string[] = Array.isArray(s.weaknesses) ? s.weaknesses : [];
      for (const w of weaknesses) {
        const key = String(w).trim();
        if (!key) continue;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));
  }, [sortedAttempts]);

  // Pro-only insights (matches Writing Progress “shape”)
  const insights = useMemo(() => {
    if (!progressSummary || !sortedAttempts.length) return null;

    if (progressSummary.scoredAttempts < 3) {
      return { hasEnoughData: false } as const;
    }

    // 1) Weakest criterion
    let weakestKey: CriterionKey | null = null;
    let weakestAvg = Infinity;

    (Object.keys(criterionSummary) as CriterionKey[]).forEach((k) => {
      const avg = criterionSummary[k].average;
      if (avg === null) return;
      if (avg < weakestAvg) {
        weakestAvg = avg;
        weakestKey = k;
      }
    });

    // 2) Difficulty-weighted band (Speaking: Part 2/3 weighted higher)
    let weightedSum = 0;
    let totalWeight = 0;

    for (const att of sortedAttempts) {
      const overall = getOverall(att);
      if (typeof overall !== "number") continue;

      const partKey =
        (att.part as PartKey | null) ??
        parsePartFromQuestionId(att.question_id) ??
        null;

      let weight = 1;
      if (partKey === "part2") weight += 0.2;
      if (partKey === "part3") weight += 0.3;

      weightedSum += overall * weight;
      totalWeight += weight;
    }

    const weightedBand = totalWeight > 0 ? weightedSum / totalWeight : null;

    // 3) Predicted exam-day band (last 5 scored, small realism penalty, rounded to 0.5)
    const lastScored: number[] = [];
    for (const att of sortedAttempts) {
      const overall = getOverall(att);
      if (typeof overall === "number") lastScored.push(overall);
      if (lastScored.length >= 5) break;
    }

    let predictedExamBand: number | null = null;
    if (lastScored.length > 0) {
      const avg = lastScored.reduce((s, v) => s + v, 0) / lastScored.length;
      const adjusted = avg - 0.25;
      const rounded = Math.round(adjusted * 2) / 2;
      predictedExamBand = Math.max(0, Math.min(9, rounded));
    }

    return {
      hasEnoughData: true,
      weakestKey,
      weakestAvg: weakestKey ? weakestAvg : null,
      weightedBand,
      predictedExamBand,
    } as const;
  }, [progressSummary, sortedAttempts, criterionSummary]);

    // Mini “chart” (simple bars) — no libs, no drama
  const chartPoints = useMemo(() => {
    const pts = sortedAttempts
      .map((a) => ({ id: a.id, overall: getOverall(a), created_at: a.created_at }))
      .filter((p) => typeof p.overall === "number") as { id: string; overall: number; created_at: string }[];

    // show last 12 scored (oldest → newest for a nicer “progress” feel)
    return pts.slice(0, 12).reverse();
  }, [sortedAttempts]);

  const chartMax = useMemo(() => {
    if (!chartPoints.length) return 9;
    return Math.max(9, ...chartPoints.map((p) => p.overall));
  }, [chartPoints]);

  // Not logged in state (same as Writing)
  if (!session) {
    return (
      <main className="min-h-dvh bg-white text-slate-900">
        <div className="mx-auto max-w-3xl space-y-6 p-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Speaking progress</h1>
              <p className="mt-1 text-xs text-slate-500">
                Sign in to see your IELTS practice stats.
              </p>
            </div>
          </header>

          <Card className="space-y-4 p-6">
            <p className="text-sm text-slate-600">
              You need to be logged in to track your speaking attempts and band scores.
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/speaking/practice">Back to practice</Link>
              </Button>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-white text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Speaking progress</h1>
            <p className="mt-1 text-xs text-slate-500">
              A summary of your AI-scored IELTS speaking attempts.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/speaking/practice">Back to practice</Link>
          </Button>
        </header>

        {/* Overall snapshot */}
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Overall snapshot</h2>
              <p className="text-[11px] text-slate-500">
                Totals, best performance, and your most recent overall band.
              </p>
            </div>
            {loading && <span className="text-[11px] text-slate-400">Loading…</span>}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {!loading && !error && !progressSummary && (
            <p className="text-sm text-slate-600">
              You haven&apos;t completed any AI-scored speaking attempts yet. Record an answer and submit it
              to see your stats here.
            </p>
          )}

          {!loading && !error && progressSummary && (
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <StatCard
                label="Total attempts"
                value={progressSummary.totalAttempts}
                hint="All speaking attempts you’ve submitted."
              />
              <StatCard
                label="Scored attempts"
                value={progressSummary.scoredAttempts}
                hint="Attempts that have a valid overall band."
              />
              <StatCard
                label="Best overall band"
                value={progressSummary.bestOverall}
                hint="Your highest overall score so far."
                formatBand
              />
              <StatCard
                label="Average overall band"
                value={progressSummary.averageOverall}
                hint="Mean overall band across your scored attempts."
                formatBand
              />
              <div className="rounded-md bg-slate-50 p-4 sm:col-span-2">
                <p className="text-[11px] uppercase text-slate-500">
                  Last attempt (overall)
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {progressSummary.lastOverall !== null
                    ? progressSummary.lastOverall.toFixed(1)
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  The most recent overall band you received.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Chart (basic bars) */}
        {!loading && !error && chartPoints.length > 0 && (
          <Card className="space-y-3 p-6">
            <div>
              <h2 className="text-sm font-semibold">Overall band over time</h2>
              <p className="text-[11px] text-slate-500">
                Your last {chartPoints.length} scored speaking attempts.
              </p>
            </div>

            <div className="flex items-end gap-2 rounded-md bg-slate-50 p-4">
              {chartPoints.map((p) => {
                const h = Math.max(4, Math.round((p.overall / chartMax) * 80));
                const label = new Date(p.created_at).toLocaleDateString();
                return (
                  <Link
                    key={p.id}
                    href={`/speaking/attempts/${p.id}`}
                    className="group flex w-full flex-col items-center"
                    title={`${label} • Band ${p.overall.toFixed(1)}`}
                  >
                    <div
                      className="w-full rounded-sm bg-slate-300 group-hover:bg-slate-400"
                      style={{ height: `${h}px` }}
                    />
                    <span className="mt-2 text-[10px] text-slate-500">
                      {p.overall.toFixed(1)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </Card>
        )}

        {/* Band by speaking part */}
        {!loading && !error && sortedAttempts.length > 0 && (
          <Card className="space-y-4 p-6">
            <div>
              <h2 className="text-sm font-semibold">Band by speaking part</h2>
              <p className="text-[11px] text-slate-500">
                Average overall bands for Part 1 / Part 2 / Part 3.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              {(Object.keys(partLabels) as PartKey[]).map((key) => {
                const c = partSummary[key];
                return (
                  <div key={key} className="rounded-md bg-slate-50 p-4">
                    <p className="text-[11px] uppercase text-slate-500">{partLabels[key]}</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {c.average !== null ? c.average.toFixed(1) : "—"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {c.count > 0
                        ? `${c.count} attempt${c.count === 1 ? "" : "s"} scored.`
                        : "No scored attempts yet in this part."}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Band by criterion */}
        {!loading && !error && sortedAttempts.length > 0 && (
          <Card className="space-y-4 p-6">
            <div>
              <h2 className="text-sm font-semibold">Band by criterion</h2>
              <p className="text-[11px] text-slate-500">
                Average AI sub-scores across your attempts.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              {(Object.keys(criterionLabels) as CriterionKey[]).map((key) => {
                const c = criterionSummary[key];
                return (
                  <div key={key} className="rounded-md bg-slate-50 p-4">
                    <p className="text-[11px] uppercase text-slate-500">{criterionLabels[key]}</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {c.average !== null ? c.average.toFixed(1) : "—"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {c.count > 0
                        ? `${c.count} attempt${c.count === 1 ? "" : "s"} scored.`
                        : "Not enough data yet."}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Weakness trend */}
        {!loading && !error && sortedAttempts.length > 0 && (
          <Card className="space-y-3 p-6 text-sm">
            <div>
              <h2 className="text-sm font-semibold">Most common weaknesses</h2>
              <p className="text-[11px] text-slate-500">
                Frequency of repeated weaknesses across your attempts.
              </p>
            </div>

            {weaknessTrend.length === 0 ? (
              <p className="text-sm text-slate-600">No weaknesses detected yet.</p>
            ) : (
              <div className="divide-y divide-slate-200">
                {weaknessTrend.map((w) => (
                  <div key={w.label} className="flex items-center justify-between py-2">
                    <span className="text-slate-700">{w.label}</span>
                    <span className="text-xs text-slate-500">{w.count}×</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Recent attempts */}
        {!loading && !error && recentAttempts.length > 0 && (
          <Card className="space-y-3 p-6 text-sm">
            <div>
              <h2 className="text-sm font-semibold">Recent attempts</h2>
              <p className="text-[11px] text-slate-500">
                Your latest speaking attempts and overall bands.
              </p>
            </div>

            <div className="divide-y divide-slate-200 text-xs sm:text-sm">
              {recentAttempts.map((att) => {
                const date = new Date(att.created_at);
                const overall = getOverall(att);
                const partKey =
                  (att.part as PartKey | null) ??
                  parsePartFromQuestionId(att.question_id) ??
                  null;

                const partLabel = partKey ? partLabels[partKey] : "Part";
                const qNum = parseQuestionNumber(att.question_id);
                const qLabel = qNum ? `Q${qNum}` : att.question_id ? `Q ${att.question_id}` : "Question";

                return (
                  <div
                    key={att.id}
                    className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-800">
                        {date.toLocaleDateString()}{" "}
                        {date.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Speaking • {partLabel} • {qLabel}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-slate-700">
                        {typeof overall === "number" ? `Band ${overall.toFixed(1)}` : "Band —"}
                      </span>
                      <Link
                        href={`/speaking/attempts/${att.id}`}
                        className="text-[11px] font-semibold text-emerald-700 hover:underline"
                      >
                        View details →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Insights & trends — PRO only (same UX as Writing) */}
        {!loading && !error && sortedAttempts.length > 0 && (
          <Card className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Insights & trends (Pro)</h2>
                <p className="text-[11px] text-slate-500">
                  Weak skill detection, study suggestions, and an exam-day band prediction.
                </p>
              </div>
              {profileLoading && (
                <span className="text-[11px] text-slate-400">Checking plan…</span>
              )}
            </div>

            {!isPro && (
              <div className="space-y-2 rounded-md bg-slate-50 p-4 text-xs text-slate-600">
                <p>
                  Unlock personalized insights, weak-skill detection, and exam-day band predictions with{" "}
                  <span className="font-semibold">IELTS Pro</span>.
                </p>
                <p>
                  These insights are based on your full attempt history and are available only to Pro students.
                </p>
                <Button asChild size="sm" className="mt-1">
                  <Link href="/profile">Upgrade to Pro</Link>
                </Button>
              </div>
            )}

            {isPro && insights && (
              <>
                {!insights.hasEnoughData && (
                  <p className="text-xs text-slate-600">
                    Keep practicing — once you have at least 3 scored attempts, we&apos;ll unlock detailed insights here.
                  </p>
                )}

                {insights.hasEnoughData && (
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-md bg-slate-50 p-4">
                        <p className="text-[11px] uppercase text-slate-500">
                          Difficulty-weighted band
                        </p>
                        <p className="mt-1 text-2xl font-semibold">
                          {insights.weightedBand !== null ? insights.weightedBand.toFixed(1) : "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Weighted higher for Part 2 and Part 3 performance.
                        </p>
                      </div>

                      <div className="rounded-md bg-slate-50 p-4">
                        <p className="text-[11px] uppercase text-slate-500">
                          Predicted exam-day band
                        </p>
                        <p className="mt-1 text-2xl font-semibold">
                          {insights.predictedExamBand !== null ? insights.predictedExamBand.toFixed(1) : "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Based on your last few attempts, with a small realism adjustment.
                        </p>
                      </div>
                    </div>

                    {insights.weakestKey && (
                      <div className="rounded-md bg-slate-50 p-4">
                        <p className="text-[11px] uppercase text-slate-500">
                          Highlighted weak area
                        </p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {criterionLabels[insights.weakestKey]}{" "}
                          {typeof insights.weakestAvg === "number"
                            ? `(avg ${insights.weakestAvg.toFixed(1)})`
                            : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Focus your next practice sessions on this criterion to lift your overall band fastest.
                        </p>
                      </div>
                    )}

                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                      <p className="mb-2 font-semibold uppercase text-emerald-800">
                        Suggested study plan (next 7–10 days)
                      </p>
                      <ul className="list-disc space-y-1 pl-5">
                        <li>Do 1 timed speaking attempt per day (rotate Part 1 → Part 2 → Part 3).</li>
                        <li>After each attempt, rewrite 3–5 sentences from your transcript using stronger vocabulary.</li>
                        <li>Pick your weakest criterion and drill it for 15 minutes daily (targeted micro-practice).</li>
                        <li>Re-attempt one older question each week to verify improvement.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  hint,
  formatBand,
}: {
  label: string;
  value: number | null;
  hint: string;
  formatBand?: boolean;
}) {
  const v =
    value === null ? "—" : formatBand ? (value as number).toFixed(1) : String(value);

  return (
    <div className="rounded-md bg-slate-50 p-4">
      <p className="text-[11px] uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{v}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
