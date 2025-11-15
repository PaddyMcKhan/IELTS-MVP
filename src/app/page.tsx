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

// Helper: default exam duration based on IELTS task
function defaultDurationForTask(task: 'task1' | 'task2'): number {
  // Task 1 -> 20 minutes, Task 2 -> 40 minutes
  return task === 'task1' ? 20 * 60 : 40 * 60;
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export default function Home() {
  const [mode, setMode] = useState<'academic' | 'general'>('academic');
  const [task, setTask] = useState<'task1' | 'task2'>('task2');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask = useMemo(
    () => TASKS.find(t => t.id === selectedTaskId) ?? null,
    [selectedTaskId]
  );

  // Exam duration in seconds; default driven by task type
  const [duration, setDuration] = useState<number>(defaultDurationForTask(task));

  // Timer control
  const [isRunning, setIsRunning] = useState(false);
  const [resetToken, setResetToken] = useState(0);

  // Autosave key depends on module + task + selected task id
  const storageKey = useMemo(
    () => `ielts:essay:${mode}:${task}:${selectedTaskId ?? 'none'}`,
    [mode, task, selectedTaskId]
  );

  const [essay, setEssay] = useLocalStorage(storageKey, '');

  // Word count derived from essay
  const currentWordCount = useMemo(() => countWords(essay), [essay]);

  // Warn if navigating away with text
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

  // Minimum recommended words per IELTS task
  const minWords = task === 'task1' ? 150 : 250;

  const handleSubmit = () => {
    if (currentWordCount < minWords) {
      const proceed = window.confirm(
        `You have written ${currentWordCount} words, but the recommended minimum for ${
          task === 'task1' ? 'Task 1' : 'Task 2'
        } is ${minWords} words.\n\nSubmitting fewer words may reduce your band score for Task Response.\n\nDo you still want to submit?`
      );
      if (!proceed) return;
    }

    // For now this is just a demo; later we’ll hook this into the scoring flow.
    alert('Essay submitted (demo). In a future step, this will trigger band score analysis.');
  };

  return (
    <main className="min-h-dvh bg-white text-slate-900 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">IELTS Writing Practice</h1>
          <Link href="https://github.com/" target="_blank" className="text-sm underline">
            GitHub
          </Link>
        </header>

        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Module</Label>
              <Select
                value={mode}
                onValueChange={(v) => {
                  setMode(v as any);
                  setSelectedTaskId(null);
                  setIsRunning(false);
                  setResetToken((t) => t + 1);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Task</Label>
              <Select
                value={task}
                onValueChange={(v) => {
                  const newTask = v as 'task1' | 'task2';
                  setTask(newTask);
                  setSelectedTaskId(null);
                  setIsRunning(false);
                  // Auto-set duration according to IELTS guidelines (20/40)
                  setDuration(defaultDurationForTask(newTask));
                  setResetToken((t) => t + 1);
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="task1">Task 1 (20 min / 150 words)</SelectItem>
                  <SelectItem value="task2">Task 2 (40 min / 250 words)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={String(duration)}
                onValueChange={(v) => {
                  setDuration(Number(v));
                  setIsRunning(false);
                  setResetToken((t) => t + 1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={(20 * 60).toString()}>20 min (Task 1)</SelectItem>
                  <SelectItem value={(40 * 60).toString()}>40 min (Task 2)</SelectItem>
                  <SelectItem value={(60 * 60).toString()}>60 min (Full test)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <Timer
              key={`${mode}-${task}-${duration}-${selectedTaskId ?? 'none'}-${resetToken}`}
              initialSeconds={duration}
              isRunning={isRunning}
              onComplete={() => setIsRunning(false)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsRunning((prev) => !prev)}
              >
                {isRunning ? 'Pause exam' : 'Start exam'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsRunning(false);
                  setResetToken((t) => t + 1);
                }}
              >
                Reset timer
              </Button>
              <Button
                variant="secondary"
                onClick={() => setEssay('')}
                title="Clear essay text (does not affect autosave key)"
              >
                Clear essay
              </Button>
              <Button
                variant="default"
                onClick={handleSubmit}
              >
                Submit (UI only)
              </Button>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Task 1: recommended minimum 150 words (~20 minutes). Task 2: recommended minimum 250 words (~40 minutes).
          </p>
        </Card>

        <Card className="p-4 space-y-4">
          <TaskFeed
            module={mode}
            task={task}
            selectedId={selectedTaskId}
            onChange={(id) => {
              setSelectedTaskId(id);
              setIsRunning(false);
              setResetToken((t) => t + 1);
            }}
          />
          {prompt && (
            <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              <strong>Prompt:</strong> {prompt}
            </div>
          )}
          <EssayBox
            value={essay}
            onChange={(next) => {
              // Auto-start exam on first keystroke if not already running
              if (!isRunning && essay.trim().length === 0 && next.trim().length > 0) {
                setIsRunning(true);
              }
              setEssay(next);
            }}
          />
          <p className="text-xs text-slate-500">
            Current words: {currentWordCount} / minimum {minWords} for {
              task === 'task1' ? 'Task 1' : 'Task 2'
            }.
          </p>
        </Card>
      </div>
    </main>
  );
}
