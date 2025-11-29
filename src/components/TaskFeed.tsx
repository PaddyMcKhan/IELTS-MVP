"use client";

import { TASKS, Task } from "@/data/tasks";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  module: "academic" | "general";
  task: "task1" | "task2";
  selectedId: string | null;
  onChange: (id: string | null) => void;
};

export default function TaskFeed({ module, task, selectedId, onChange }: Props) {
  // Filter tasks for the current module + task type
  const items: Task[] = TASKS.filter(
    (t) => t.module === module && t.task === task
  );

  return (
    <div className="space-y-2">
      <Label htmlFor="question-select">Select a practice question</Label>

      {items.length === 0 ? (
        <p className="text-xs text-slate-500">
          No questions yet for this combination. Try switching module or task.
        </p>
      ) : (
        <Select
          value={selectedId ?? ""}
          onValueChange={(value) => {
            if (!value) {
              onChange(null);
            } else {
              onChange(value);
            }
          }}
        >
          <SelectTrigger id="question-select">
            <SelectValue placeholder="Select a practice question" />
          </SelectTrigger>
          <SelectContent>
            {items.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.shortLabel}{" "}
                <span className="text-xs text-slate-500">
                  ({t.minWords} words)
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
