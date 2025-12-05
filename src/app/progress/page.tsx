"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSupabaseSession } from "@/components/SupabaseSessionProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AttemptRow = {
  id: string;
  user_id: string | null;
  question_id: string;
  essay_text: string;
  score_json: any;
  created_at: string;
};

export default function ProgressPage() {
  const { session, supabase } = useSupabaseSession();
  const userId = (session?.user as any)?.id ?? null;

  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const progressSummary = useMemo(() => {
    if (!attempts || attempts.length === 0) {
      return null;
    }

    const overallScores: number[] = [];

    for (const attempt of attempts) {
      const overall = (attempt as any)?.score_json?.overall;
      if (typeof overall === "number") {
        overallScores.push(overall);
      }
    }

    const totalAttempts = attempts.length;
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

    // assuming newest attempt first
    const lastOverall = overallScores[0];

    return {
      totalAttempts,
      scoredAttempts,
      bestOverall,
      averageOverall,
      lastOverall,
    };
  }, [attempts]);

  // Not logged in state
  if (!session) {
    return (
      <main className="min-h-dvh bg-white text-slate-900">
        <div className="mx-auto max-w-3xl space-y-6 p-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Your progress</h1>
              <p className="text-xs text-slate-500 mt-1">
                Sign in to see your IELTS practice stats.
              </p>
            </div>
          </header>

          <Card className="p-6 space-y-4">
            <p className="text-sm text-slate-600">
              You need to be logged in to track your attempts and band scores.
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
            <p className="text-xs text-slate-500 mt-1">
              A summary of your AI-scored IELTS writing attempts.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/">Back to practice</Link>
          </Button>
        </header>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Overall snapshot</h2>
              <p className="text-[11px] text-slate-500">
                Totals, best performance, and your most recent overall band.
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
              You haven&apos;t completed any AI-scored attempts yet.
              Go to the practice page, write an essay, and submit it to see your stats here.
            </p>
          )}

          {!loading && !error && progressSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
      </div>
    </main>
  );
}
