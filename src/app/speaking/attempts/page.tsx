"use client";

import { useEffect, useState } from "react";
import { useSupabaseSession } from "@/components/SupabaseSessionProvider";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type SpeakingAttemptRow = {
  id: string;
  user_id: string | null;
  question_id: string | null; // e.g. "p1-1"
  part?: string | null; // e.g. "part1"
  duration_seconds?: number | null;
  overall_band?: number | null;
  transcript?: string | null;
  audio_path?: string | null;
  score_json?: any;
  model?: string | null;
  created_at: string;
};

function formatDateTime(iso: string) {
  try {
    return iso ? new Date(iso).toLocaleString() : "";
  } catch {
    return "";
  }
}

function parsePart(questionId?: string | null, partField?: string | null) {
  // prefer explicit part field if present
  const p = (partField ?? "").toLowerCase().trim();
  if (p === "part1") return "Part 1";
  if (p === "part2") return "Part 2";
  if (p === "part3") return "Part 3";

  // otherwise infer from question_id like "p1-1"
  const q = (questionId ?? "").toLowerCase();
  const m = q.match(/^p([123])-(\d+)$/);
  if (!m) return null;
  return `Part ${m[1]}`;
}

function parseQ(questionId?: string | null) {
  const q = (questionId ?? "").toLowerCase();
  const m = q.match(/^p([123])-(\d+)$/);
  if (!m) return questionId ? `Q: ${questionId}` : null;
  return `Q: p${m[1]}-${m[2]}`;
}

function getOverall(att: SpeakingAttemptRow) {
  const sj = att.score_json ?? {};
  const score = sj?.score && typeof sj.score === "object" ? sj.score : sj;

  const overallFromJson =
    score && typeof score.overall_band === "number" ? score.overall_band : null;

  const overall =
    overallFromJson !== null
      ? overallFromJson
      : typeof att.overall_band === "number"
      ? att.overall_band
      : null;

  return overall;
}

function partTitleStyle(partLabel?: string | null) {
  if (!partLabel) return "text-slate-800";

  if (partLabel.includes("2")) {
    return "text-blue-700";
  }

  if (partLabel.includes("3")) {
    return "text-indigo-700";
  }

  return "text-slate-800"; // Part 1
}

export default function SpeakingAttemptsPage() {
  const { session } = useSupabaseSession();
  const userId = (session?.user as any)?.id ?? null;

  const [attempts, setAttempts] = useState<SpeakingAttemptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAttempts() {
    setLoading(true);
    setError(null);
    try {
      const q = userId ? `?userId=${encodeURIComponent(userId)}` : "";
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

  useEffect(() => {
    loadAttempts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <main className="min-h-dvh bg-white text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Speaking Attempts</h1>
            <p className="mt-1 text-xs text-slate-500">
              A history of your speaking submissions with AI scores.
            </p>
          </div>

          <Button asChild>
            <Link href="/speaking/practice">New attempt</Link>
          </Button>
        </header>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing your most recent speaking attempts.
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

        {/* Empty */}
        {!loading && !error && attempts.length === 0 && (
          <Card className="p-4 text-sm text-slate-600">
            No speaking attempts found yet. Go to{" "}
            <Link href="/speaking/practice" className="underline">
              speaking practice
            </Link>{" "}
            and submit an attempt to see it appear here.
          </Card>
        )}

        {/* Attempts list */}
        {attempts.length > 0 && (
          <Card className="overflow-hidden p-0">
            {/* Header row — identical width logic to Writing */}
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
              {attempts.map((a) => {
                const overall = getOverall(a);
                const hasBand = typeof overall === "number";
                const overallText = hasBand ? `Band ${overall!.toFixed(1)}` : "Not scored";

                const dateText = formatDateTime(a.created_at);

                const partLabel = parsePart(a.question_id, a.part) ?? "Part";
                const qLabel = parseQ(a.question_id) ?? "Q";

                // Transcript preview: keep it short like Writing (prevents mammoth rows)
                const rawPrompt =
                  (a as any).question_prompt?.trim?.() ||
                  "Question prompt not saved (older attempt)";
                const promptPreview =
                  rawPrompt.length > 90 ? `${rawPrompt.slice(0, 90)}…` : rawPrompt;

                const duration = typeof a.duration_seconds === "number" ? `${a.duration_seconds}s` : null;

                return (
                  <li key={a.id} className="hover:bg-slate-50">
                    <Link
                      href={`/speaking/attempts/${a.id}`}
                      className="flex items-start justify-between px-4 py-3"
                    >
                      {/* Question */}
                      <div className="w-1/3 pr-3">
                        <div
                          className={`truncate font-semibold ${partTitleStyle(partLabel)}`}
                        >
                          {partLabel ? `Speaking · ${partLabel}` : "Speaking"}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                          {partLabel}{duration ? ` • ${duration}` : ""}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {promptPreview}
                        </div>
                      </div>

                      {/* Date */}
                      <div className="w-1/3 pr-3">
                        <div className="text-xs text-slate-600">{dateText}</div>
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
                        <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 text-[11px] text-slate-600 whitespace-nowrap">
                          {a.model ?? "—"}
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
