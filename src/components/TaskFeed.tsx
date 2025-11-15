'use client';
import { useMemo } from 'react';
import { TASKS, TaskItem } from '@/data/tasks';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  module: 'academic' | 'general';
  task: 'task1' | 'task2';
  selectedId: string | null;
  onChange: (id: string) => void;
};

export default function TaskFeed({ module, task, selectedId, onChange }: Props) {
  const list = useMemo(
    () => TASKS.filter(t => t.module === module && t.task === task),
    [module, task]
  );

  return (
    <div className="space-y-2">
      <Label>Choose a {module} {task === 'task1' ? 'Task 1' : 'Task 2'} Question</Label>
      <Select value={selectedId ?? ''} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Select a practice question" /></SelectTrigger>
        <SelectContent>
          {list.map((t: TaskItem) => (
            <SelectItem key={t.id} value={t.id}>{t.title} — {t.minutes} min</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
