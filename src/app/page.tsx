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

type Scores = {
  taskResponse: number;
  coherence: number;
  lexical: number;
  grammar: number;
};

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

  // Pro toggle: free (gpt-4o-mini) vs pro (gpt-4o)
  const [isPro, setIsPro] = useState(false);

  const storageKey = useMemo(
    () => `ielts:essay:${mode}:${task}:${selectedTaskId ?? 'none'}`,
    [mode, task, selectedTaskId]
  );

  const [essay, setEssay] = useLocalStorage(storageKey, '');
  const currentWordCount = useMemo(() => countWords(essay), [essay]);

  const prompt = selectedTask?.prompt ?? '';
  const minWords = task === 'task1' ? 150 : 250;

  // Self-assessment sliders (student prediction)
  const [selfScores, setSelfScores] = useState<Scores>({
    taskResponse: 6,
    coherence: 6,
    lexical: 6,
    grammar: 6,
  });
  const [hasPrediction, setHasPrediction] = useState(false);
  const [predictionLocked, setPredictionLocked] = useState(false);
  const [prediction, setPrediction] = useState<Scores | null>(null);

  // LIVE predicted overall from sliders (always based on selfScores)
  const livePredictedOverall = useMemo(() => {
    const avg =
      (selfScores.taskResponse +
        selfScores.coherence +
        selfScores.lexical +
        selfScores.grammar) / 4;
    return Math.round(avg * 2) / 2;
  }, [selfScores]);

  // Modal / results data
  const [showResults, setShowResults] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const resetFeedback = () => {
    setAiResult(null);
    setShowResults(false);
    setPredictionLocked(false);
    setHasPrediction(false);
    setPrediction(null);
    setSelfScores({
      taskResponse: 6,
      coherence: 6,
      lexical: 6,
      grammar: 6,
    });
  };

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

    // Lock prediction for this attempt (if user touched sliders)
    if (hasPrediction) {
      setPrediction({ ...selfScores });
    } else {
      setPrediction(null);
    }
    setPredictionLocked(true);

    setIsRunning(false);
    setIsLoading(true);

    try {
      const query = isPro ? '?pro=true' : '';
      const res = await fetch(`/api/score${query}`, {
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
                  resetFeedback();
                  setEssay('');
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
                  resetFeedback();
                  setEssay('');
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

          {/* TIMER + CONTROLS */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Timer
              key={`${mode}-${task}-${duration}-${selectedTaskId}-${resetToken}`}
              initialSeconds={duration}
              isRunning={isRunning}
              onComplete={() => setIsRunning(false)}
            />
            <div className="flex flex-wrap items-center gap-3">
              {/* Pro toggle */}
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={isPro}
                  onChange={(e) => setIsPro(e.target.checked)}
                  className="h-4 w-4"
                />
                <span>
                  Use <span className="font-semibold">Pro scoring</span> (gpt-4o)
                </span>
              </label>

              <Button
                variant="outline"
                onClick={() => setIsRunning(!isRunning)}
              >
                {isRunning ? "Pause exam" : "Start exam"}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setIsRunning(false); setResetToken(t => t + 1); }}
              >
                Reset timer
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEssay('');
                  resetFeedback();
                }}
              >
                Clear essay
              </Button>
              <Button
                variant="default"
                onClick={handleSubmit}
              >
                Submit (AI scoring)
              </Button>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Scoring model: {isPro ? "Pro (gpt-4o)" : "Free (gpt-4o-mini, suitable for practice)"}.
          </p>
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
              resetFeedback();
              setEssay('');
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

        {/* SELF-ASSESSMENT CARD */}
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Self-assessment (optional)</h2>
              <p className="text-xs text-slate-500">
                Use the sliders to predict your band before submitting. Your prediction will lock for this attempt once you click &quot;Submit&quot;.
              </p>
            </div>
            {predictionLocked && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                Prediction locked
              </span>
            )}
          </div>

          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <p className="text-xs uppercase text-slate-500">Your predicted overall band</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-semibold">
                {hasPrediction ? livePredictedOverall.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-slate-500">
                Move the sliders below to set your guess.
              </span>
            </div>
          </div>

          <div className="space-y-4 text-sm">
            {/* Task Response */}
            <div>
              <div className="flex items-center justify-between">
                <Label>Task Response</Label>
                <span className="text-xs text-slate-500">
                  Band {selfScores.taskResponse.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={9}
                step={0.5}
                disabled={predictionLocked}
                value={selfScores.taskResponse}
                onChange={(e) => {
                  setHasPrediction(true);
                  const val = parseFloat(e.target.value);
                  setSelfScores(prev => ({ ...prev, taskResponse: val }));
                }}
                className="mt-2 w-full"
              />
            </div>

            {/* Coherence */}
            <div>
              <div className="flex items-center justify-between">
                <Label>Coherence & Cohesion</Label>
                <span className="text-xs text-slate-500">
                  Band {selfScores.coherence.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={9}
                step={0.5}
                disabled={predictionLocked}
                value={selfScores.coherence}
                onChange={(e) => {
                  setHasPrediction(true);
                  const val = parseFloat(e.target.value);
                  setSelfScores(prev => ({ ...prev, coherence: val }));
                }}
                className="mt-2 w-full"
              />
            </div>

            {/* Lexical Resource */}
            <div>
              <div className="flex items-center justify-between">
                <Label>Lexical Resource</Label>
                <span className="text-xs text-slate-500">
                  Band {selfScores.lexical.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={9}
                step={0.5}
                disabled={predictionLocked}
                value={selfScores.lexical}
                onChange={(e) => {
                  setHasPrediction(true);
                  const val = parseFloat(e.target.value);
                  setSelfScores(prev => ({ ...prev, lexical: val }));
                }}
                className="mt-2 w-full"
              />
            </div>

            {/* Grammar */}
            <div>
              <div className="flex items-center justify-between">
                <Label>Grammatical Range & Accuracy</Label>
                <span className="text-xs text-slate-500">
                  Band {selfScores.grammar.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={9}
                step={0.5}
                disabled={predictionLocked}
                value={selfScores.grammar}
                onChange={(e) => {
                  setHasPrediction(true);
                  const val = parseFloat(e.target.value);
                  setSelfScores(prev => ({ ...prev, grammar: val }));
                }}
                className="mt-2 w-full"
              />
            </div>
          </div>
        </Card>

        {/* RESULTS PANEL (INLINE CARD, NOT POPUP) */}
        {showResults && aiResult && (
          <BandScoreModal
            task={task}
            wordCount={currentWordCount}
            minWords={minWords}
            aiData={aiResult}
            prediction={prediction}
            isPro={isPro}
            onClose={() => {
              setShowResults(false);
            }}
          />
        )}
      </div>
    </main>
  );
}
