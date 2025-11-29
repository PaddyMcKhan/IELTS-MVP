'use client';

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTaskLabel } from "@/lib/taskLabels";

type AttemptRow = {
  id: string;
  user_id: string | null;
  question_id: string;
  essay_text: string;
  score_json: any;
  created_at: string;
};

export default function AttemptsPage() {
  const { data: session } = useSession();
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
    loadAttempts();
  }, [userId]);

  return (
    <main className="min-h-dvh bg-white text-slate-900 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">My IELTS Attempts</h1>
            <p className="text-xs text-slate-500 mt-1">
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
          <Card className="p-3 border-red-200 bg-red-50 text-xs text-red-700">
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
          <Card className="p-0 overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-semibold text-slate-600 w-1/3">
                Question
              </span>
              <span className="text-xs font-semibold text-slate-600 w-1/3">
                Date
              </span>
              <span className="text-xs font-semibold text-slate-600 w-1/6 text-right">
                Overall
              </span>
              <span className="text-xs font-semibold text-slate-600 w-1/6 text-right">
                Model
              </span>
            </div>

            <ul className="divide-y divide-slate-100 text-sm">
              {attempts.map((att) => {
                const score =
                  att.score_json && typeof att.score_json === "object"
                    ? (att.score_json as any)
                    : (() => {
                        try {
                          return JSON.parse(att.score_json as any);
                        } catch {
                          return null;
                        }
                      })();

                const overall =
                  score && typeof score.overall === "number"
                    ? score.overall
                    : null;

                const overallText =
                  overall !== null ? `Band ${overall.toFixed(1)}` : "Band —";

                const model =
                  score && typeof score.modelUsed === "string"
                    ? score.modelUsed
                    : "unknown";

                const dateText = att.created_at
                  ? new Date(att.created_at).toLocaleString()
                  : "";

                return (
                  <li key={att.id} className="hover:bg-slate-50">
                    <Link
                      href={`/attempts/${att.id}`}
                      className="block px-4 py-3 flex items-start justify-between"
                    >
                      {/* Question */}
                      <div className="w-1/3 pr-3">
                        <div className="font-medium text-slate-800 truncate">
                          {formatTaskLabel(att.question_id)}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight truncate">
                          {att.question_id}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {att.essay_text.slice(0, 80)}
                          {att.essay_text.length > 80 ? "…" : ""}
                        </div>
                      </div>

                      {/* Date */}
                      <div className="w-1/3 pr-3">
                        <div className="text-xs text-slate-600">{dateText}</div>
                      </div>

                      {/* Overall */}
                      <div className="w-1/6 text-right">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                          {overallText}
                        </span>
                      </div>

                      {/* Model */}
                      <div className="w-1/6 text-right">
                        <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 text-[11px] text-slate-500">
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
