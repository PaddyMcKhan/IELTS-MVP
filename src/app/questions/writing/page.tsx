"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import { createClient } from "@/utils/supabase/client";

type WritingTaskRow = {
  id: number;
  task_type: string; // "task1_academic" | "task2_general" | etc.
  prompt: string;
  min_words: number | null;
  title?: string | null;
  category?: string | null;
  is_active?: boolean | null;
};

const modeLabels: Record<string, string> = {
  academic: "Academic",
  general: "General",
};

const taskLabels: Record<string, string> = {
  task1: "Task 1",
  task2: "Task 2",
};

function getModeFromTaskType(taskType: string): "academic" | "general" | "unknown" {
  if (taskType.endsWith("_academic")) return "academic";
  if (taskType.endsWith("_general")) return "general";
  return "unknown";
}

function getTaskFromTaskType(taskType: string): "task1" | "task2" | "unknown" {
  if (taskType.startsWith("task1")) return "task1";
  if (taskType.startsWith("task2")) return "task2";
  return "unknown";
}

export default function QuestionsPage() {
  const supabase = createClient();

  const [tasks, setTasks] = useState<WritingTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [modeFilter, setModeFilter] = useState<"all" | "academic" | "general">(
    "all"
  );
  const [taskFilter, setTaskFilter] = useState<"all" | "task1" | "task2">(
    "all"
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadQuestions() {
      setLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("writing_tasks")
        .select("id, task_type, prompt, min_words, title, is_active")
        .eq("is_active", true)
        .order("id", { ascending: true });

      if (error) {
        console.error("Error loading questions:", error);
        setErrorMessage("Failed to load questions from Supabase.");
        setLoading(false);
        return;
      }

      setTasks((data || []) as WritingTaskRow[]);
      setLoading(false);
    }

    loadQuestions();
  }, [supabase]);

  const filteredTasks = useMemo(() => {
    let current = [...tasks];

    if (modeFilter !== "all") {
      current = current.filter(
        (t) => getModeFromTaskType(t.task_type) === modeFilter
      );
    }

    if (taskFilter !== "all") {
      current = current.filter(
        (t) => getTaskFromTaskType(t.task_type) === taskFilter
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      current = current.filter((t) => {
        const inPrompt = t.prompt.toLowerCase().includes(q);
        const inCategory = (t.category || "").toLowerCase().includes(q);
        return inPrompt || inCategory;
      });
    }

    return current;
  }, [tasks, modeFilter, taskFilter, search]);

  return (
    <PageShell
      title="Writing Questions"
      description="Browse IELTS writing questions and choose your next practice task."
    >
      <div className="space-y-6">
        {/* Controls row */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2 md:flex-row">
            <div className="flex flex-col text-xs text-slate-400">
              <span className="mb-1 font-medium text-slate-300">
                Module
              </span>
              <select
                value={modeFilter}
                onChange={(e) =>
                  setModeFilter(e.target.value as "all" | "academic" | "general")
                }
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              >
                <option value="all">All modules</option>
                <option value="academic">Academic</option>
                <option value="general">General</option>
              </select>
            </div>

            <div className="flex flex-col text-xs text-slate-400">
              <span className="mb-1 font-medium text-slate-300">
                Task type
              </span>
              <select
                value={taskFilter}
                onChange={(e) =>
                  setTaskFilter(e.target.value as "all" | "task1" | "task2")
                }
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              >
                <option value="all">Task 1 &amp; Task 2</option>
                <option value="task1">Task 1</option>
                <option value="task2">Task 2</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col text-xs text-slate-400 md:w-64">
            <span className="mb-1 font-medium text-slate-300">Search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by topic, keyword, or category"
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Content */}
        {loading && (
          <p className="text-sm text-slate-400">
            Loading questions from Supabase…
          </p>
        )}

        {errorMessage && (
          <p className="text-sm text-red-500">{errorMessage}</p>
        )}

        {!loading && !errorMessage && filteredTasks.length === 0 && (
          <p className="text-sm text-slate-400">
            No questions match your filters yet.
          </p>
        )}

        {!loading && !errorMessage && filteredTasks.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredTasks.map((task) => {
              const modeKey = getModeFromTaskType(task.task_type);
              const taskKey = getTaskFromTaskType(task.task_type);

              const modeLabel = modeLabels[modeKey] ?? modeKey;
              const taskLabel = taskLabels[taskKey] ?? taskKey;
              const minWordsLabel =
                task.min_words && task.min_words > 0
                  ? `${task.min_words} words`
                  : undefined;

              return (
                <article
                  key={task.id}
                  className="flex h-full flex-col rounded-lg border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {modeLabel} • {taskLabel}
                    </span>
                    <span className="text-slate-500">Q{task.id}</span>
                  </div>

                  {task.category && (
                    <div className="mb-2 text-[11px] uppercase tracking-wide text-emerald-400">
                      {task.category}
                    </div>
                  )}

                  {task.title && (
                    <h3 className="mb-1 text-sm font-semibold text-slate-100">
                      {task.title}
                    </h3>
                  )}

                  <p className="mb-3 line-clamp-3 text-sm text-slate-100">
                    {task.prompt}
                  </p>

                  <div className="mt-auto flex items-center justify-between text-xs text-slate-500">
                    <div>
                      {minWordsLabel && (
                        <span>Minimum: {minWordsLabel}</span>
                      )}
                    </div>

                    <Link
                      href={`/?question_id=${task.id}&mode=${modeKey}&task=${taskKey}`}
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
