"use client";

import { useEffect, useState } from "react";
import { useSupabaseSession } from "@/components/SupabaseSessionProvider";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTaskLabel } from "@/lib/taskLabels";

type AttemptRow = {
  id: string;
  user_id: string | null;
  question_id: string;
  // optional / legacy fields that may or may not be present
  question_text?: string | null;
  essay_text: string;
  score_json: any;
  created_at: string;
  overall_band?: number | null;
  is_pro?: boolean | null;

  // NEW: module + task coming from essay_attempts
  module?: string | null; // "academic" | "general" | null
  task?: string | null;   // "task1" | "task2" | null
};

function formatModuleTaskLabel(
  moduleValue?: string | null,
  taskValue?: string | null
): string {
  if (!moduleValue || !taskValue) {
    // nice fallback for older “legacy” rows
    return "Legacy attempt";
  }

  const moduleLabel =
    moduleValue === "academic"
      ? "Academic"
      : moduleValue === "general"
      ? "General"
      : moduleValue.charAt(0).toUpperCase() + moduleValue.slice(1);

  const taskLabel =
    taskValue === "task1"
      ? "Task 1"
      : taskValue === "task2"
      ? "Task 2"
      : taskValue;

  // e.g. "Academic Task 2"
  return `${moduleLabel} ${taskLabel}`;
}

export default function AttemptsPage() {
  const { session } = useSupabaseSession();
  const userId = (session?.user as any)?.id ?? null;

  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAttempts() {
    setLoading(true);
    setError(null);
    try {
      const q = userId ? `?userId=${encodeURIComponent(userId)}` : "";
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

    useEffect(() => {
    if (!userId) return;
    loadAttempts();
  }, [userId]);

  return (
    <main className="min-h-dvh bg-white text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Writing Attempts</h1>
            <p className="mt-1 text-xs text-slate-500">
              A history of your recent writing submissions with AI scores.
            </p>
          </div>
        </header>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing the 20 most recent attempts.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAttempts}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </Card>
        )}

        {/* Empty state */}
        {!loading && !error && attempts.length === 0 && (
          <Card className="p-4 text-sm text-slate-600">
            No attempts found yet. Go back to the{" "}
            <Link href="/" className="underline">
              practice page
            </Link>{" "}
            and submit an essay to see it appear here.
          </Card>
        )}

        {/* Attempts list */}
        {attempts.length > 0 && (
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
              <span className="w-1/3 text-xs font-semibold text-slate-600">
                Question
              </span>
              <span className="w-1/3 text-xs font-semibold text-slate-600">
                Date
              </span>
              <span className="w-1/6 text-right text-xs font-semibold text-slate-600">
                Overall
              </span>
              <span className="w-1/6 text-right text-xs font-semibold text-slate-600">
                Model
              </span>
            </div>

            <ul className="divide-y divide-slate-100 text-sm">
              {attempts.map((att) => {
                // Normalise score_json: object or JSON string
                const score =
                  att.score_json && typeof att.score_json === "object"
                    ? (att.score_json as any)
                    : (() => {
                        try {
                          return att.score_json
                            ? JSON.parse(att.score_json as any)
                            : null;
                        } catch {
                          return null;
                        }
                      })();

                // Overall band: prefer JSON, fall back to overall_band column
                const overallFromJson =
                  score && typeof score.overall === "number"
                    ? score.overall
                    : null;

                const overall =
                  overallFromJson !== null
                    ? overallFromJson
                    : typeof (att as any).overall_band === "number"
                    ? (att as any).overall_band
                    : null;

                const hasBand = overall !== null;
                const overallText = hasBand
                  ? `Band ${overall.toFixed(1)}`
                  : "Not scored";

                // Model label: prefer stored modelUsed, fall back to is_pro, otherwise nice placeholder
                let model: string;
                if (score && typeof score.modelUsed === "string") {
                  model = score.modelUsed;
                } else if ((att as any).is_pro === true) {
                  model = "gpt-4o";
                } else if ((att as any).is_pro === false) {
                  model = "gpt-4o-mini";
                } else {
                  model = "Legacy";
                }

                const dateText = att.created_at
                  ? new Date(att.created_at).toLocaleString()
                  : "";

                // Question preview: prefer stored question_text, fall back to essay snippet
                let questionPreviewSource =
                  (att as any).question_text ?? att.essay_text ?? "";

                // Clean ugly "Question: ..." prefix from legacy rows
                const lower = questionPreviewSource.toLowerCase();
                if (lower.startsWith("question:")) {
                  questionPreviewSource = questionPreviewSource
                    .slice("question:".length)
                    .trim();
                }

                const questionPreview =
                  questionPreviewSource.length > 80
                    ? `${questionPreviewSource.slice(0, 80)}…`
                    : questionPreviewSource;

                // Make numeric IDs look intentional (legacy Task 5 → "Legacy task 5")
                // Nicely formatted module/task label for the tiny grey line
                const questionIdLine = formatModuleTaskLabel(
                  (att as any).module,
                  (att as any).task
                );

                // Not logged in state (match Progress pages)
                if (!session) {
                  return (
                    <main className="min-h-dvh bg-white text-slate-900">
                      <div className="mx-auto max-w-3xl space-y-6 p-6">
                        <header className="flex items-center justify-between">
                          <div>
                            <h1 className="text-2xl font-semibold">Writing Attempts</h1>
                            <p className="mt-1 text-xs text-slate-500">
                              Sign in to see your attempt history.
                            </p>
                          </div>
                        </header>

                        <Card className="space-y-4 p-6">
                          <p className="text-sm text-slate-600">
                            You need to be logged in to view your writing attempts.
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
                  <li key={att.id} className="hover:bg-slate-50">
                    <Link
                      href={`/attempts/${att.id}`}
                      className="flex items-start justify-between px-4 py-3"
                    >
                      {/* Question */}
                      <div className="w-1/3 pr-3">
                        <div className="truncate font-medium text-slate-800">
                          {formatTaskLabel(att.question_id)}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                          {questionIdLine}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {questionPreview}
                        </div>
                      </div>

                      {/* Date */}
                      <div className="w-1/3 pr-3">
                        <div className="text-xs text-slate-600">
                          {dateText}
                        </div>
                      </div>

                      {/* Overall */}
                      <div className="w-1/6 text-right">
                        <span
                          className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700"
                          title={hasBand ? "Overall band score" : "No band saved for this attempt"}
                        >
                          {overallText}
                        </span>
                      </div>

                      {/* Model */}
                      <div className="w-1/6 text-right">
                        <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                          {model}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </main>
  );
}
