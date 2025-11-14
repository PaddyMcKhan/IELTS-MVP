'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Timer from '@/components/Timer';
import EssayBox from '@/components/EssayBox';
import TaskFeed from '@/components/TaskFeed';
import useLocalStorage from '@/hooks/useLocalStorage';
import { TASKS } from '@/data/tasks';

export default function Home() {
  const [mode, setMode] = useState<'academic' | 'general'>('academic');
  const [task, setTask] = useState<'task1' | 'task2'>('task2');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // If a task is selected, prefer its default minutes. Otherwise fall back to dropdown.
  const selectedTask = useMemo(() => TASKS.find(t => t.id === selectedTaskId) ?? null, [selectedTaskId]);
  const [duration, setDuration] = useState<number>(60 * 60);
  useEffect(() => {
    if (selectedTask) setDuration(selectedTask.minutes * 60);
  }, [selectedTaskId]); // eslint-disable-line

  // Autosave key depends on module + task + selected task id
  const storageKey = useMemo(
    () => `ielts:essay:${mode}:${task}:${selectedTaskId ?? 'none'}`,
    [mode, task, selectedTaskId]
  );

  const [essay, setEssay] = useLocalStorage(storageKey, '');

  // Optional: warn on unload if essay not empty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (essay.trim().length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [essay]);

  const prompt = selectedTask?.prompt ?? '';

  return (
    <main className="min-h-dvh bg-white text-slate-900 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">IELTS Writing Practice</h1>
          <Link href="https://github.com/" target="_blank" className="text-sm underline">GitHub</Link>
        </header>

        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Module</Label>
              <Select value={mode} onValueChange={(v)=>{ setMode(v as any); setSelectedTaskId(null); }}>
                <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Task</Label>
              <Select value={task} onValueChange={(v)=>{ setTask(v as any); setSelectedTaskId(null); }}>
                <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="task1">Task 1</SelectItem>
                  <SelectItem value="task2">Task 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={String(duration)} onValueChange={(v)=>setDuration(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Duration" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={(20*60).toString()}>20 min</SelectItem>
                  <SelectItem value={(40*60).toString()}>40 min</SelectItem>
                  <SelectItem value={(60*60).toString()}>60 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            {/* key forces timer reset when any of these change */}
            <Timer key={`${mode}-${task}-${duration}-${selectedTaskId ?? 'none'}`} seconds={duration} />
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setEssay('')}
                title="Clear essay text (does not affect autosave key)"
              >
                Clear
              </Button>
              <Button variant="default" onClick={() => alert('Submit clicked (UI only). We will add scoring later.')}>
                Submit (UI only)
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <TaskFeed
            module={mode}
            task={task}
            selectedId={selectedTaskId}
            onChange={setSelectedTaskId}
          />
          {prompt && (
            <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              <strong>Prompt:</strong> {prompt}
            </div>
          )}
          <EssayBox value={essay} onChange={setEssay} />
        </Card>
      </div>
    </main>
  );
}
