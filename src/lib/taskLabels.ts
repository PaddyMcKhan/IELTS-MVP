// lib/taskLabels.ts

// src/lib/taskLabels.ts

// Friendly names for known tasks.
// You can expand this as your `writing_tasks` table grows.
export const TASK_LABELS: Record<string, string> = {
  // ✅ New numeric IDs from Supabase `writing_tasks`
  // ID 5 = Academic Task 2 – communication technology & relationships
  "5": "Academic Task 2 — Communication technology & relationships",

  // (keep / add any string IDs you still use anywhere)
  "a-t2-education": "Academic Task 2 — Education",
  "a-t2-environment": "Academic Task 2 — Environment",
  "a-t2-technology": "Academic Task 2 — Technology & Society",
  "g-t1-letter-neighbour": "General Task 1 — Letter to a Neighbour",
  "g-t2-work-life": "General Task 2 — Work–Life Balance",
};

export function formatTaskLabel(taskId: string | null | undefined): string {
  if (!taskId) return "Unknown task";

  // Exact match first
  const mapped = TASK_LABELS[taskId];
  if (mapped) return mapped;

  // Nice fallback for other numeric IDs (future rows)
  if (/^\d+$/.test(taskId)) {
    return `Question ${taskId}`;
  }

  // Last-resort fallback: show the raw ID
  return taskId;
}


