"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import { createClient } from "@/utils/supabase/client";

type SpeakingQuestionRow = {
  id: string;
  part: "part1" | "part2" | "part3";
  prompt: string | null;

  // Part 2 cue card fields (nullable for other parts)
  cue_title: string | null;
  cue_points: string[] | null;

  // Optional metadata
  topic: string | null;
  prep_time_sec: number | null;
  speak_time_sec: number | null;

  is_active?: boolean | null;
};

const partLabels: Record<SpeakingQuestionRow["part"], string> = {
  part1: "Speaking Part 1",
  part2: "Speaking Part 2",
  part3: "Speaking Part 3",
};

function formatSeconds(sec?: number | null) {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function SpeakingQuestionsPage() {
  const supabase = createClient();

  const [questions, setQuestions] = useState<SpeakingQuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [partFilter, setPartFilter] = useState<"all" | "part1" | "part2" | "part3">(
    "all"
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadQuestions() {
      setLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("speaking_questions")
        .select(
          "id, part, prompt, cue_title, cue_points, topic, prep_time_sec, speak_time_sec, is_active"
        )
        .eq("is_active", true)
        .order("part", { ascending: true })
        .order("topic", { ascending: true });

      if (error) {
        console.error("Error loading speaking questions:", error);
        setErrorMessage("Failed to load speaking questions from Supabase.");
        setLoading(false);
        return;
      }

      setQuestions((data || []) as SpeakingQuestionRow[]);
      setLoading(false);
    }

    loadQuestions();
  }, [supabase]);

  const filtered = useMemo(() => {
    let current = [...questions];

    if (partFilter !== "all") {
      current = current.filter((q) => q.part === partFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      current = current.filter((row) => {
        const inPrompt = (row.prompt || "").toLowerCase().includes(q);
        const inTopic = (row.topic || "").toLowerCase().includes(q);
        const inCueTitle = (row.cue_title || "").toLowerCase().includes(q);
        const inCuePoints = (row.cue_points || []).some((p) =>
          (p || "").toLowerCase().includes(q)
        );
        return inPrompt || inTopic || inCueTitle || inCuePoints;
      });
    }

    return current;
  }, [questions, partFilter, search]);

  return (
    <PageShell
      title="Speaking Questions"
      description="Browse IELTS speaking questions and choose your next practice prompt."
    >
      <div className="space-y-6">
        {/* Controls row */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="flex flex-col text-xs text-slate-400">
              <span className="mb-1 font-medium text-slate-300">Part</span>
              <select
                value={partFilter}
                onChange={(e) =>
                  setPartFilter(e.target.value as "all" | "part1" | "part2" | "part3")
                }
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              >
                <option value="all">All parts</option>
                <option value="part1">Part 1</option>
                <option value="part2">Part 2</option>
                <option value="part3">Part 3</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col text-xs text-slate-400 md:w-64">
            <span className="mb-1 font-medium text-slate-300">Search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by topic, keyword, or cue card bullets"
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Content */}
        {loading && (
          <p className="text-sm text-slate-400">Loading questions from Supabase…</p>
        )}

        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}

        {!loading && !errorMessage && filtered.length === 0 && (
          <p className="text-sm text-slate-400">No questions match your filters yet.</p>
        )}

        {!loading && !errorMessage && filtered.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((q) => {
              const label = partLabels[q.part] ?? q.part;

              const title =
                q.part === "part2"
                  ? q.cue_title || "Cue card"
                  : q.prompt || "Prompt";

              const subtitle =
                q.topic ? q.topic.toUpperCase() : q.part === "part2" ? "CUE CARD" : "PROMPT";

              const prep = q.part === "part2" ? formatSeconds(q.prep_time_sec) : null;
              const speak = formatSeconds(q.speak_time_sec);

              return (
                <article
                  key={q.id}
                  className="flex h-full flex-col rounded-lg border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                    <span>{label}</span>
                    <span className="text-slate-500">ID {q.id.slice(0, 8)}</span>
                  </div>

                  <div className="mb-2 text-[11px] uppercase tracking-wide text-emerald-400">
                    {subtitle}
                  </div>

                  <h3 className="mb-2 text-sm font-semibold text-slate-100 line-clamp-2">
                    {title}
                  </h3>

                  {q.part !== "part2" && q.prompt && (
                    <p className="mb-3 line-clamp-3 text-sm text-slate-100">{q.prompt}</p>
                  )}

                  {q.part === "part2" && (
                    <div className="mb-3 space-y-2 text-sm text-slate-100">
                      {q.prompt && (
                        <p className="line-clamp-2 text-slate-200">{q.prompt}</p>
                      )}

                      {Array.isArray(q.cue_points) && q.cue_points.length > 0 && (
                        <ul className="list-disc pl-5 text-slate-200">
                          {q.cue_points.slice(0, 4).map((p, idx) => (
                            <li key={idx} className="line-clamp-1">
                              {p}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between text-xs text-slate-500">
                    <div>
                      {q.part === "part2" ? (
                        <span>
                          {prep ? `Prep: ${prep}` : null}
                          {prep && speak ? " • " : null}
                          {speak ? `Speak: ${speak}` : null}
                        </span>
                      ) : (
                        <span>{speak ? `Suggested: ${speak}` : null}</span>
                      )}
                    </div>

                    <Link
                      href={`/speaking/practice?question_id=${q.id}`}
                      className="text-[11px] font-semibold text-emerald-400 hover:underline"
                    >
                      Practice this question
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
