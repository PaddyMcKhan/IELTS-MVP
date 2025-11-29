// lib/taskLabels.ts

export const TASK_LABELS: Record<string, string> = {
  "a-t2-education": "Academic Task 2 — Education",
  "a-t2-environment": "Academic Task 2 — Environment",
  "a-t2-technology": "Academic Task 2 — Technology & Society",
  "g-t1-letter-neighbour": "General Task 1 — Letter to a Neighbour",
  "g-t2-work-life": "General Task 2 — Work–Life Balance",
  // add more as your dataset grows
};

export function formatTaskLabel(taskId: string | null | undefined): string {
  if (!taskId) return "Unknown task";
  return TASK_LABELS[taskId] ?? taskId; // fallback = raw ID
}

