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
import BandScoreModal from '@/components/BandScoreModal';

// Default IELTS durations
function defaultDurationForTask(task: 'task1' | 'task2'): number {
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

  const [duration, setDuration] = useState<number>(defaultDurationForTask(task));
  const [isRunning, setIsRunning] = useState(false);
  const [resetToken, setResetToken] = useState(0);

  const storageKey = useMemo(
    () => `ielts:essay:${mode}:${task}:${selectedTaskId ?? 'none'}`,
    [mode, task, selectedTaskId]
  );

  const [essay, setEssay] = useLocalStorage(storageKey, '');
  const currentWordCount = useMemo(() => countWords(essay), [essay]);

  // Modal and AI
  const [showResults, setShowResults] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const prompt = selectedTask?.prompt ?? '';
  const minWords = task === 'task1' ? 150 : 250;

  // Before unload warning
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

  // Handle submit → AI scoring
  const handleSubmit = async () => {
    if (currentWordCount < minWords) {
      const proceed = window.confirm(
        `You have written ${currentWordCount} words, but the minimum for ${
          task === 'task1' ? 'Task 1' : 'Task 2'
        } is ${minWords}. Submitting fewer words may reduce your Task Response score.\n\nProceed anyway?`
      );
      if (!proceed) return;
    }

    setIsRunning(false);
    setIsLoading(true);

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essay,
          task,
          wordCount: currentWordCount,
          question: prompt,
        }),
      });

      const data = await res.json();
      if (data.error) {
        alert("Scoring failed: " + data.error);
        setIsLoading(false);
        return;
      }

      setAiResult(data);
      setShowResults(true);

    } catch (err) {
      alert("Error scoring essay");
      console.error(err);
    }

    setIsLoading(false);
  };

  // Loading screen
  if (isLoading) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-white text-slate-900">
        <div className="text-center space-y-4">
          <div className="animate-spin text-4xl">⏳</div>
          <p className="text-sm text-slate-600">Scoring your essay with AI examiner…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-white text-slate-900 p-6">
      <div className="mx-auto max-w-3xl space-y-6">

        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">IELTS Writing Practice</h1>
          <Link href="https://github.com/" target="_blank" className="text-sm underline">
            GitHub
          </Link>
        </header>

        {/* CONFIG PANEL */}
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* MODULE */}
            <div className="space-y-2">
              <Label>Module</Label>
              <Select
                value={mode}
                onValueChange={(v) => {
                  setMode(v as any);
                  setSelectedTaskId(null);
                  setIsRunning(false);
                  setResetToken(t => t + 1);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* TASK */}
            <div className="space-y-2">
              <Label>Task</Label>
              <Select
                value={task}
                onValueChange={(v) => {
                  const t = v as 'task1' | 'task2';
                  setTask(t);
                  setSelectedTaskId(null);
                  setIsRunning(false);
                  setDuration(defaultDurationForTask(t));
                  setResetToken(k => k + 1);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="task1">Task 1 (20 min / 150 words)</SelectItem>
                  <SelectItem value="task2">Task 2 (40 min / 250 words)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* DURATION */}
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={String(duration)}
                onValueChange={(v) => {
                  setDuration(Number(v));
                  setIsRunning(false);
                  setResetToken(t => t + 1);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={(20 * 60).toString()}>20 min (Task 1)</SelectItem>
                  <SelectItem value={(40 * 60).toString()}>40 min (Task 2)</SelectItem>
                  <SelectItem value={(60 * 60).toString()}>60 min (Full test)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* TIMER CONTROL */}
          <div className="flex items-center justify-between gap-4">
            <Timer
              key={`${mode}-${task}-${duration}-${selectedTaskId}-${resetToken}`}
              initialSeconds={duration}
              isRunning={isRunning}
              onComplete={() => setIsRunning(false)}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setIsRunning(!isRunning)}>
                {isRunning ? "Pause exam" : "Start exam"}
              </Button>
              <Button variant="outline" onClick={() => { setIsRunning(false); setResetToken(t => t + 1); }}>
                Reset timer
              </Button>
              <Button variant="secondary" onClick={() => setEssay('')}>
                Clear essay
              </Button>
              <Button variant="default" onClick={handleSubmit}>
                Submit (AI scoring)
              </Button>
            </div>
          </div>

        </Card>

        {/* QUESTION + ESSAY */}
        <Card className="p-4 space-y-4">
          <TaskFeed
            module={mode}
            task={task}
            selectedId={selectedTaskId}
            onChange={(id) => {
              setSelectedTaskId(id);
              setIsRunning(false);
              setResetToken(t => t + 1);
            }}
          />

          {prompt && (
            <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              <strong>Question:</strong> {prompt}
            </div>
          )}

          <EssayBox
            value={essay}
            onChange={(text) => {
              if (!isRunning && essay.trim().length === 0 && text.trim().length > 0) {
                setIsRunning(true);
              }
              setEssay(text);
            }}
          />

          <p className="text-xs text-slate-500">
            Current words: {currentWordCount} / minimum {minWords}
          </p>

        </Card>
      </div>

      {/* AI MODAL */}
      {showResults && aiResult && (
        <BandScoreModal
          task={task}
          wordCount={currentWordCount}
          essay={essay}
          aiData={aiResult}
          onClose={() => setShowResults(false)}
        />
      )}

    </main>
  );
}
