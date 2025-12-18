"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSupabaseSession } from "@/components/SupabaseSessionProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AttemptRow = {
  id: string;
  user_id: string | null;
  question_id: string | null;
  essay_text: string | null;
  score_json: any;
  created_at: string;
  module?: string | null; // "academic" | "general"
  task?: string | null;   // "task1" | "task2"
};

type CategoryKey =
  | "academic_task1"
  | "academic_task2"
  | "general_task1"
  | "general_task2";

const categoryLabels: Record<CategoryKey, string> = {
  academic_task1: "Academic Task 1",
  academic_task2: "Academic Task 2",
  general_task1: "General Task 1",
  general_task2: "General Task 2",
};

type CriterionKey = "taskResponse" | "coherence" | "lexical" | "grammar";

const criterionLabels: Record<CriterionKey, string> = {
  taskResponse: "Task response",
  coherence: "Coherence & cohesion",
  lexical: "Lexical resource",
  grammar: "Grammar range & accuracy",
};

function isCriterionKey(v: unknown): v is CriterionKey {
  return typeof v === "string" && v in criterionLabels;
}

export default function ProgressPage() {
  const { session, supabase } = useSupabaseSession();
  const userId = (session?.user as any)?.id ?? null;

  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [plan, setPlan] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Load attempts for this user
  useEffect(() => {
    if (!userId) return;

    async function loadAttempts() {
      setLoading(true);
      setError(null);
      try {
        const q = `?userId=${encodeURIComponent(userId)}`;
        const res = await fetch(`/api/attempts${q}`);
        const json = await res.json();
        if (!res.ok || json.error) {
          setError(json.error || "Failed to load attempts");
          return;
        }
        setAttempts(json.attempts ?? []);
      } catch (err) {
        console.error("Failed to load attempts:", err);
        setError("Failed to load attempts");
      } finally {
        setLoading(false);
      }
    }

    loadAttempts();
  }, [userId]);

  // Load profile plan to know if user is PRO
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
          console.error("Progress page profile load error:", error);
          return;
        }

        setPlan((data as any)?.plan ?? null);
      } catch (err) {
        console.error("Unexpected error loading profile for progress page:", err);
      } finally {
        setProfileLoading(false);
      }
    }

    loadProfile();
  }, [supabase, userId]);

  const isPro = (plan ?? "").toUpperCase() === "PRO";

  // Newest first
  const sortedAttempts = useMemo(() => {
    if (!attempts || attempts.length === 0) return [];
    return [...attempts].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return db - da;
    });
  }, [attempts]);

  const progressSummary = useMemo(() => {
    if (!sortedAttempts || sortedAttempts.length === 0) {
      return null;
    }

    const overallScores: number[] = [];

    for (const attempt of sortedAttempts) {
      const overall = (attempt as any)?.score_json?.overall;
      if (typeof overall === "number") {
        overallScores.push(overall);
      }
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
    const averageOverall =
      overallScores.reduce((sum, score) => sum + score, 0) / scoredAttempts;

    // newest attempt first in overallScores
    const lastOverall = overallScores[0];

    return {
      totalAttempts,
      scoredAttempts,
      bestOverall,
      averageOverall,
      lastOverall,
    };
  }, [sortedAttempts]);

  // Breakdown by module + task
  const categorySummary = useMemo(() => {
    const base: Record<
      CategoryKey,
      { count: number; sum: number; average: number | null }
    > = {
      academic_task1: { count: 0, sum: 0, average: null },
      academic_task2: { count: 0, sum: 0, average: null },
      general_task1: { count: 0, sum: 0, average: null },
      general_task2: { count: 0, sum: 0, average: null },
    };

    for (const attempt of sortedAttempts) {
      const m = attempt.module;
      const t = attempt.task;
      const overall = (attempt as any)?.score_json?.overall;

      if (typeof overall !== "number") continue;
      if (!m || !t) continue;

      let key: CategoryKey | null = null;
      if (m === "academic" && t === "task1") key = "academic_task1";
      if (m === "academic" && t === "task2") key = "academic_task2";
      if (m === "general" && t === "task1") key = "general_task1";
      if (m === "general" && t === "task2") key = "general_task2";

      if (!key) continue;

      base[key].count += 1;
      base[key].sum += overall;
    }

    (Object.keys(base) as CategoryKey[]).forEach((k) => {
      const c = base[k];
      c.average = c.count > 0 ? c.sum / c.count : null;
    });

    return base;
  }, [sortedAttempts]);

  // Last 5 attempts for listing
  const recentAttempts = useMemo(
    () => sortedAttempts.slice(0, 5),
    [sortedAttempts]
  );

  // Criterion averages (task response, coherence, lexical, grammar)
  const criterionSummary = useMemo(() => {
    const base: Record<CriterionKey, { count: number; sum: number; average: number | null }> = {
      taskResponse: { count: 0, sum: 0, average: null },
      coherence: { count: 0, sum: 0, average: null },
      lexical: { count: 0, sum: 0, average: null },
      grammar: { count: 0, sum: 0, average: null },
    };

    for (const attempt of sortedAttempts) {
      const s = (attempt as any).score_json || {};
      const tr = s.taskResponse;
      const coh = s.coherence;
      const lex = s.lexical;
      const gra = s.grammar;

      if (typeof tr === "number") {
        base.taskResponse.count += 1;
        base.taskResponse.sum += tr;
      }
      if (typeof coh === "number") {
        base.coherence.count += 1;
        base.coherence.sum += coh;
      }
      if (typeof lex === "number") {
        base.lexical.count += 1;
        base.lexical.sum += lex;
      }
      if (typeof gra === "number") {
        base.grammar.count += 1;
        base.grammar.sum += gra;
      }
    }

    (Object.keys(base) as CriterionKey[]).forEach((k) => {
      const c = base[k];
      c.average = c.count > 0 ? c.sum / c.count : null;
    });

    return base;
  }, [sortedAttempts]);

  // Pro-only insights layer
  type Insights =
    | { hasEnoughData: false }
    | {
      hasEnoughData: true;
      weakestKey: CriterionKey | null;
      weakestAvg: number | null;
      weightedBand: number | null;
      predictedExamBand: number | null;
    };

  const insights = useMemo<Insights>(() => {
    if (!progressSummary || !sortedAttempts.length) {
      return { hasEnoughData: false };
    }

    // Require at least 3 scored attempts to show strong insights
    if (progressSummary.scoredAttempts < 3) {
      return { hasEnoughData: false };
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

    // 2) Difficulty-weighted band (Academic + Task 2 weighted higher)
    let weightedSum = 0;
    let totalWeight = 0;

    for (const attempt of sortedAttempts) {
      const overall = (attempt as any)?.score_json?.overall;
      if (typeof overall !== "number") continue;

      let weight = 1;
      if (attempt.task === "task2") weight += 0.3;
      if (attempt.module === "academic") weight += 0.2;

      weightedSum += overall * weight;
      totalWeight += weight;
    }

    const weightedBand = totalWeight > 0 ? weightedSum / totalWeight : null;

    // 3) Predicted real exam band (last 5 scored, -0.25 realism penalty, round to 0.5)
    const lastScored: number[] = [];
    for (const attempt of sortedAttempts) {
      const overall = (attempt as any)?.score_json?.overall;
      if (typeof overall === "number") lastScored.push(overall);
      if (lastScored.length >= 5) break;
    }

    let predictedExamBand: number | null = null;
    if (lastScored.length > 0) {
      const avg = lastScored.reduce((sum, v) => sum + v, 0) / lastScored.length;
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
    };
  }, [progressSummary, sortedAttempts, criterionSummary]);

  // Not logged in state
  if (!session) {
    return (
      <main className="min-h-dvh bg-white text-slate-900">
        <div className="mx-auto max-w-3xl space-y-6 p-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Your progress</h1>
              <p className="mt-1 text-xs text-slate-500">
                Sign in to see your IELTS practice stats.
              </p>
            </div>
          </header>

          <Card className="space-y-4 p-6">
            <p className="text-sm text-slate-600">
              You need to be logged in to track your attempts and band
              scores.
            </p>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Back to practice</Link>
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
            <h1 className="text-2xl font-semibold">Your progress</h1>
            <p className="mt-1 text-xs text-slate-500">
              A summary of your AI-scored IELTS writing attempts.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/">Back to practice</Link>
          </Button>
        </header>

        {/* Overall snapshot */}
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Overall snapshot</h2>
              <p className="text-[11px] text-slate-500">
                Totals, best performance, and your most recent overall
                band.
              </p>
            </div>
            {loading && (
              <span className="text-[11px] text-slate-400">Loading…</span>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-600">
              {error}
            </p>
          )}

          {!loading && !error && !progressSummary && (
            <p className="text-sm text-slate-600">
              You haven&apos;t completed any AI-scored attempts yet. Go to
              the practice page, write an essay, and submit it to see your
              stats here.
            </p>
          )}

          {!loading && !error && progressSummary && (
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-4">
                <p className="text-[11px] uppercase text-slate-500">
                  Total attempts
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {progressSummary.totalAttempts}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  All essays you&apos;ve submitted with AI scoring.
                </p>
              </div>

              <div className="rounded-md bg-slate-50 p-4">
                <p className="text-[11px] uppercase text-slate-500">
                  Scored attempts
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {progressSummary.scoredAttempts}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Attempts that have a valid overall band.
                </p>
              </div>

              <div className="rounded-md bg-slate-50 p-4">
                <p className="text-[11px] uppercase text-slate-500">
                  Best overall band
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {progressSummary.bestOverall !== null
                    ? progressSummary.bestOverall.toFixed(1)
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Your highest overall score so far.
                </p>
              </div>

              <div className="rounded-md bg-slate-50 p-4">
                <p className="text-[11px] uppercase text-slate-500">
                  Average overall band
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {progressSummary.averageOverall !== null
                    ? progressSummary.averageOverall.toFixed(1)
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Mean overall band across your scored attempts.
                </p>
              </div>

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

        {/* Band by task type */}
        {!loading && !error && sortedAttempts.length > 0 && (
          <Card className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">
                  Band by task type
                </h2>
                <p className="text-[11px] text-slate-500">
                  Average overall bands for Academic / General, Task 1 /
                  Task 2.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              {(Object.keys(categoryLabels) as CategoryKey[]).map((key) => {
                const c = categorySummary[key];
                return (
                  <div
                    key={key}
                    className="rounded-md bg-slate-50 p-4"
                  >
                    <p className="text-[11px] uppercase text-slate-500">
                      {categoryLabels[key]}
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {c.average !== null
                        ? c.average.toFixed(1)
                        : "—"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {c.count > 0
                        ? `${c.count} attempt${
                            c.count === 1 ? "" : "s"
                          } scored.`
                        : "No scored attempts yet in this category."}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Recent attempts */}
        {!loading && !error && recentAttempts.length > 0 && (
          <Card className="space-y-3 p-6 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">
                  Recent attempts
                </h2>
                <p className="text-[11px] text-slate-500">
                  Your latest essays and overall bands.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-200 text-xs sm:text-sm">
              {recentAttempts.map((attempt) => {
                const date = new Date(attempt.created_at);
                const overall =
                  (attempt as any)?.score_json?.overall;
                const moduleLabel =
                  attempt.module === "academic"
                    ? "Academic"
                    : attempt.module === "general"
                    ? "General"
                    : null;
                const taskLabel =
                  attempt.task === "task1"
                    ? "Task 1"
                    : attempt.task === "task2"
                    ? "Task 2"
                    : null;

                return (
                  <div
                    key={attempt.id}
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
                        {moduleLabel && `${moduleLabel} • `}
                        {taskLabel && `${taskLabel} • `}
                        {attempt.question_id
                          ? `Q${attempt.question_id}`
                          : "Question"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-700">
                        {typeof overall === "number"
                          ? `Band ${overall.toFixed(1)}`
                          : "Band —"}
                      </span>
                      <Link
                        href={`/attempts/${attempt.id}`}
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

        {/* Insights & trends — PRO only */}
        {!loading && !error && sortedAttempts.length > 0 && (
          <Card className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">
                  Insights & trends (Pro)
                </h2>
                <p className="text-[11px] text-slate-500">
                  Highlighted weak areas, study suggestions, and a
                  difficulty-weighted band prediction.
                </p>
              </div>
              {profileLoading && (
                <span className="text-[11px] text-slate-400">
                  Checking plan…
                </span>
              )}
            </div>

            {!isPro && (
              <div className="space-y-2 rounded-md bg-slate-50 p-4 text-xs text-slate-600">
                <p>
                  Unlock personalized insights, weak-skill detection, and
                  exam-day band predictions with{" "}
                  <span className="font-semibold">IELTS Pro</span>.
                </p>
                <p>
                  These insights are based on your full attempt history
                  and are available only to Pro students.
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
                    Keep practicing — once you have at least 3 scored
                    attempts, we&apos;ll unlock detailed insights here.
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
                          {insights.weightedBand !== null
                            ? insights.weightedBand.toFixed(1)
                            : "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Adjusted for Academic tasks and Task 2 essays,
                          which are typically more demanding.
                        </p>
                      </div>

                      <div className="rounded-md bg-slate-50 p-4">
                        <p className="text-[11px] uppercase text-slate-500">
                          Predicted exam-day band
                        </p>
                        <p className="mt-1 text-2xl font-semibold">
                          {insights.predictedExamBand !== null
                            ? insights.predictedExamBand.toFixed(1)
                            : "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Based on your last few attempts, with a small
                          realism adjustment for exam pressure.
                        </p>
                      </div>
                    </div>

                    {insights.weakestKey && (
                      <div className="rounded-md bg-slate-50 p-4 text-xs text-slate-700">
                        <p className="mb-1 text-[11px] uppercase text-slate-500">
                          Highlighted weak area
                        </p>
                        <p className="font-semibold">
                          {isCriterionKey(insights.weakestKey)
                            ? criterionLabels[insights.weakestKey]
                            : "Weakest area"}{" "}
                          {insights.weakestAvg !== null &&
                            `(avg ${
                              Math.round(
                                insights.weakestAvg * 10
                              ) / 10
                            })`}
                        </p>
                        <p className="mt-1">
                          {insights.weakestKey === "taskResponse" &&
                            "You’re losing marks because the ideas don’t fully answer the question or are too short. Focus on planning: 2–3 clear main points that directly match the question, and always reach the minimum word count."}
                          {insights.weakestKey === "coherence" &&
                            "Your paragraphs may not be clearly linked or logically ordered. Practice using topic sentences, linking phrases, and one main idea per paragraph to build a smoother flow."}
                          {insights.weakestKey === "lexical" &&
                            "Your vocabulary range is limiting your band. Build topic-specific vocabulary (education, work, technology, environment) and practice using more precise, less repetitive word choices."}
                          {insights.weakestKey === "grammar" &&
                            "Grammar slips are holding your score down. Focus on accurate complex sentences, verb tenses, and subject–verb agreement. Shorter but accurate sentences are better than long but incorrect ones."}
                        </p>
                      </div>
                    )}

                    <div className="rounded-md border border-dashed border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                      <p className="mb-1 text-[11px] uppercase font-semibold">
                        Suggested study plan (next 7–10 days)
                      </p>
                      <ul className="list-disc space-y-1 pl-4">
                        <li>
                          Aim for 1–2 timed essays per day focusing on{" "}
                          {insights.weakestKey
                            ? criterionLabels[insights.weakestKey]
                            : "your weakest criterion"}
                          .
                        </li>
                        <li>
                          Alternate between Academic and General tasks
                          where possible to keep your difficulty-weighted
                          band improving.
                        </li>
                        <li>
                          After each attempt, read the AI feedback and
                          rewrite one paragraph, correcting only the
                          issues mentioned.
                        </li>
                        <li>
                          Once per week, revisit an older question and
                          rewrite it from scratch to see if your band
                          improves.
                        </li>
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
