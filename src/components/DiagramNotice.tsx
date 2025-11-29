// src/components/DiagramNotice.tsx
import type { Task } from "@/data/tasks";

type DiagramNoticeProps = {
  task: Task;
};

export function DiagramNotice({ task }: DiagramNoticeProps) {
  // We’ll only show this for graph-style / diagram tasks.
  const isDiagramTask = task.kind === "graph" || task.hasDiagram;

  if (!isDiagramTask) return null;

  const title =
    task.kind === "graph"
      ? "Task 1 chart / diagram"
      : "Task 1 visual prompt";

  return (
    <div className="mb-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
          {title}
        </span>
        <span className="text-[11px] uppercase tracking-wide text-slate-500">
          Academic Writing – Task 1
        </span>
      </div>
      <p className="text-xs leading-snug text-slate-600">
        In the real IELTS exam, you would see a chart, graph, or process
        diagram here. Use the description in the prompt to visualise the
        main trends and comparisons before you start writing.
      </p>
    </div>
  );
}
