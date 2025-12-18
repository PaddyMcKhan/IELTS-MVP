'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from "next/navigation";
import { useWritingTasks } from "@/hooks/useWritingTasks";
import { useSupabaseSession } from "@/components/SupabaseSessionProvider";
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import Timer from '@/components/Timer';
import EssayBox from '@/components/EssayBox';
import useLocalStorage from '@/hooks/useLocalStorage';
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

type AttemptRow = {
  id: string;
  user_id: string | null;
  question_id: string;
  essay_text: string;
  score_json: any;
  created_at: string;
};

export default function HomeClient() {
  const { session } = useSupabaseSession();
  const userId = (session?.user as any)?.id ?? null;

  const searchParams = useSearchParams();

  const initialQuestionIdFromUrl = searchParams?.get("question_id") ?? null;
  const initialModeFromUrl = searchParams?.get("mode") ?? null;
  const initialTaskFromUrl = searchParams?.get("task") ?? null;

  const [mode, setMode] = useState<"academic" | "general">("academic");
  const [task, setTask] = useState<"task1" | "task2">("task2");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);
  const [urlStateApplied, setUrlStateApplied] = useState(false);

  // Map UI mode/task to DB task_type (e.g. "task2_academic")
  const dbTaskType = useMemo(
    () => `${task}_${mode === "academic" ? "academic" : "general"}`,
    [task, mode]
  );

  const { tasks, loading: tasksLoading, error: tasksError } = useWritingTasks(
    dbTaskType
  );

  const selectedTask = useMemo(() => {
    if (!tasks || tasks.length === 0) return null;
    if (selectedTaskId) {
      const found = tasks.find((t: any) => t.id === selectedTaskId);
      if (found) return found;
    }
    return tasks[0];
  }, [tasks, selectedTaskId]);

  const [duration, setDuration] = useState<number>(defaultDurationForTask(task));
  const [isRunning, setIsRunning] = useState(false);
  const [resetToken, setResetToken] = useState(0);

  // Pro toggle: free (gpt-4o-mini) vs pro (gpt-4o)
  const [isPro, setIsPro] = useState(false);

    // Subscription plan: "free" or "pro" (from Supabase profiles)
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const storageKey = useMemo(
    () => `ielts:essay:${mode}:${task}:${selectedTaskId ?? 'none'}`,
    [mode, task, selectedTaskId]
  );

  const [essay, setEssay] = useLocalStorage(storageKey, '');
  const currentWordCount = useMemo(() => countWords(essay), [essay]);

  const prompt = selectedTask?.prompt ?? '';
  const minWords = selectedTask?.min_words ?? (task === "task1" ? 150 : 250);

  // Apply mode/task from URL once on initial load, if valid.
  useEffect(() => {
    if (urlStateApplied) return;

    if (initialModeFromUrl === "academic" || initialModeFromUrl === "general") {
      setMode(initialModeFromUrl);
    }

    if (initialTaskFromUrl === "task1" || initialTaskFromUrl === "task2") {
      setTask(initialTaskFromUrl);
    }

    setUrlStateApplied(true);
  }, [initialModeFromUrl, initialTaskFromUrl, urlStateApplied]);

  // Ensure we always have a selectedTaskId once tasks load,
  // and honor ?question_id=... on first load if it matches.
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;
    if (!urlStateApplied) return;
    if (initializedFromUrl) return;

    // If URL has a question_id, try to match it to the loaded tasks
    if (initialQuestionIdFromUrl) {
      const match = tasks.find((t: any) => String(t.id) === initialQuestionIdFromUrl);
      if (match) {
        setSelectedTaskId(match.id);
        setInitializedFromUrl(true);
        return;
      }
    }

    // Fallback: default to the first task (your original behavior)
    if (!selectedTaskId) {
      setSelectedTaskId(tasks[0].id);
    }

    setInitializedFromUrl(true);
  }, [
    tasks,
    selectedTaskId,
    initialQuestionIdFromUrl,
    initializedFromUrl,
    urlStateApplied,
  ]);

  // 🔁 Cloud autosave hook (Step 9C)
  const { status: autosaveStatus, lastSavedAt } = useAutosaveDraft({
    essay,
    questionId: selectedTaskId,
    mode,
    task,
    enabled: !!userId && !!selectedTaskId,
    userId,
  });

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

  // LIVE predicted overall from sliders
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

  // History (Step 8D / 8E)
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Welcome-back modal (Step 12C)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Load attempts from /api/attempts (optionally filtered by userId)
  const progressSummary = useMemo(() => {
    if (!attempts || attempts.length === 0) {
      return null;
    }

    const overallScores: number[] = [];

    for (const attempt of attempts) {
      const overall = (attempt as any)?.score_json?.overall;
      if (typeof overall === "number") {
        overallScores.push(overall);
      }
    }

    const totalAttempts = attempts.length;
    const scoredAttempts = overallScores.length;

    if (scoredAttempts === 0) {
      return {
        totalAttempts,
        scoredAttempts,
        bestOverall: null as number | null,
        averageOverall: null as number | null,
        lastOverall: null as number | null,
      };
    }

    const bestOverall = Math.max(...overallScores);
    const averageOverall =
      overallScores.reduce((sum, score) => sum + score, 0) / scoredAttempts;

    // Assuming newest attempt is first – use that as “last”
    const lastOverall = overallScores[0];

    return {
      totalAttempts,
      scoredAttempts,
      bestOverall,
      averageOverall,
      lastOverall,
    };
  }, [attempts]);

  async function loadAttempts() {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const q = userId ? `?userId=${encodeURIComponent(userId)}` : "";
      const res = await fetch(`/api/attempts${q}`);
      const json = await res.json();
      if (!res.ok || json.error) {
        setHistoryError(json.error || "Failed to load attempts");
        return;
      }
      setAttempts(json.attempts ?? []);
    } catch (err) {
      console.error("Failed to load attempts:", err);
      setHistoryError("Failed to load attempts");
    } finally {
      setHistoryLoading(false);
    }
  }

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

  // Initial load of history (re-run if userId changes)
  useEffect(() => {
    loadAttempts();
  }, [userId]);

  // Load subscription plan from /api/profile/save when userId changes
  useEffect(() => {
  // Not signed in → treat as free and ensure Pro is off
    if (!userId) {
      setPlan("free");
      setIsPro(false);
      setPlanError(null);
      return;
    }

    let cancelled = false;

    async function fetchPlan() {
  try {
    setPlanLoading(true);
    setPlanError(null);

    const res = await fetch("/api/profile/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const json = await res.json();

    if (!res.ok || json.error) {
      if (cancelled) return;
      setPlan("free");
      setIsPro(false);
      setPlanError(json.error || "Failed to load plan.");
      return;
    }

    if (cancelled) return;

    // ✅ derive apiPlan safely from response
    const apiPlanRaw =
      json.plan ??
      json.profile?.plan ??
      json.user_profile?.plan ??
      json.data?.plan ??
      "free";

    const apiPlan =
      String(apiPlanRaw).toLowerCase() === "pro" ? "pro" : "free";

    setPlan(apiPlan);

    // If the user is not Pro, make sure Pro toggle is off
    if (apiPlan !== "pro") {
      setIsPro(false);
    }
  } catch (err) {
    if (!cancelled) {
      console.error("Failed to load plan:", err);
      setPlan("free");
      setIsPro(false);
      setPlanError("Failed to load plan.");
    }
  } finally {
    if (!cancelled) {
      setPlanLoading(false);
    }
  }
}

    fetchPlan();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Welcome-back progress popup (Step 12C)
  useEffect(() => {
    if (!userId) return;
    if (!progressSummary) return;         // need stats to show
    if (historyLoading || historyError) return;

    try {
      const key = `ielts:welcomeSeen:${userId}`;
      const seen = window.localStorage.getItem(key);
      if (seen === "1") return;

      setShowWelcomeModal(true);
      window.localStorage.setItem(key, "1");
    } catch (err) {
      console.error("Welcome modal localStorage error:", err);
    }
  }, [userId, progressSummary, historyLoading, historyError]);

  // Load cloud draft when a question is selected (Step 9D)
  useEffect(() => {
    if (!userId || !selectedTaskId) return;

    let cancelled = false;
    
    if (!selectedTaskId || !userId) return;

    async function fetchDraft() {
      try {
        const res = await fetch(
          `/api/drafts?questionId=${encodeURIComponent(
            selectedTaskId ?? ""
          )}&userId=${encodeURIComponent(userId)}`
        );

        if (!res.ok) {
          console.error("Failed to load draft:", res.status);
          return;
        }

        const json = await res.json();

        if (cancelled) return;
        if (!json.draft) {
          return;
        }

        // Hydrate editor with server draft
        setEssay(json.draft.essay as string);
      } catch (err) {
        console.error("Error loading draft:", err);
      }
    }

    fetchDraft();

    return () => {
      cancelled = true;
    };
  }, [userId, selectedTaskId, setEssay]);

  // Reset all feedback state
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

  // Handle submit → AI scoring + save attempt
  const handleSubmit = async () => {
    // Step 11D: make sure a DB question is selected
    if (!selectedTaskId || !selectedTask) {
      alert("Please choose a question before submitting your essay.");
      return;
    }

    if (currentWordCount < minWords) {
      const proceed = window.confirm(
        `You have written ${currentWordCount} words, but the minimum for ${task === 'task1' ? 'Task 1' : 'Task 2'
        } is ${minWords}. Submitting fewer words may reduce your Task Response score.\n\nProceed anyway?`
      );
      if (!proceed) return;
    }

    const predictionPayload = hasPrediction ? { ...selfScores } : null;

    if (predictionPayload) {
      setPrediction(predictionPayload);
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
          task,                     // "task1" or "task2" (UI level)
          wordCount: currentWordCount,
          question: prompt,

          // 🔑 Step 11D wiring into DB world
          questionId: selectedTaskId,        // writing_tasks.id
          taskType: selectedTask?.task_type, // e.g. "task2_academic"
          minWords,                          // DB min_words (or fallback)

          // New: pass userId so /api/score can check plan
          userId: userId ?? null,
        }),
      });

      const data = await res.json();

      if (data.error) {
        alert("Scoring failed: " + data.error);
        setIsLoading(false);
        return;
      }

      const scoreToStore = predictionPayload
        ? { ...data, prediction: predictionPayload }
        : data;

      // Save to Supabase (Step 8D/8E + schema update patch)
      if (selectedTaskId) {
        try {
          const {
            taskResponse,
            coherence,
            lexical,
            grammar,
            overall,
          } = data;

          await fetch("/api/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              // high-level context
              module: mode,                 // "academic" | "general"
              task,                         // "task1" | "task2"

              // question metadata
              questionId: selectedTaskId,   // writing_tasks.id
              questionText: prompt,         // full prompt text

              // essay content
              essay,                        // legacy field (ok if server ignores)
              essayText: essay,             // main essay column
              wordCount: currentWordCount,

              // scoring + model info
              isPro,
              userId: userId ?? null,
              scoreJson: scoreToStore,      // full JSON for score_json column
              coherence,
              lexical,
              grammar,
              taskResponse,
              overallBand:
                typeof overall === "number" ? overall : undefined,
            }),
          });

          await loadAttempts();
        } catch (saveErr) {
          console.error("Failed to save essay attempt:", saveErr);
        }
      }

      setAiResult(data);
      setShowResults(true);

    } catch (err) {
      alert("Error scoring essay");
      console.error(err);
    }

    setIsLoading(false);
  };

  // Loading screen while scoring
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

  // Loading screen for tasks
  if (tasksLoading) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-white text-slate-900">
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-600">Loading writing tasks…</p>
        </div>
      </main>
    );
  }

  if (tasksError) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-white text-slate-900">
        <div className="text-center space-y-2">
          <p className="text-sm text-red-600">
            Failed to load writing tasks: {tasksError}
          </p>
        </div>
      </main>
    );
  }

    return (
      <main className="min-h-dvh bg-white text-slate-900 p-6">
        {/* Welcome-back progress popup (Step 12C) */}
        {showWelcomeModal && progressSummary && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <Card className="w-full max-w-md mx-4 p-6 space-y-4 bg-white shadow-xl rounded-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Welcome back 👋</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Here&apos;s a quick snapshot of your IELTS writing progress.
                  </p>
                </div>
                <button
                  aria-label="Close"
                  className="text-slate-400 hover:text-slate-600 text-sm"
                  onClick={() => setShowWelcomeModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-[10px] uppercase text-slate-500">
                    Total attempts
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {progressSummary.totalAttempts}
                  </p>
                </div>

                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-[10px] uppercase text-slate-500">
                    Scored attempts
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {progressSummary.scoredAttempts}
                  </p>
                </div>

                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-[10px] uppercase text-slate-500">
                    Best overall band
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {progressSummary.bestOverall !== null
                      ? progressSummary.bestOverall.toFixed(1)
                      : "—"}
                  </p>
                </div>

                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-[10px] uppercase text-slate-500">
                    Last attempt (overall)
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {progressSummary.lastOverall !== null
                      ? progressSummary.lastOverall.toFixed(1)
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="flex justify-between gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWelcomeModal(false)}
                >
                  Close
                </Button>
                <Button size="sm" asChild>
                  <Link href="/progress">
                    Open full dashboard →
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        )}

        <div className="mx-auto max-w-3xl space-y-6 p-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">IELTS Writing Practice</h1>
              <p className="text-xs text-slate-500 mt-1">
                Choose a task, start the timer, and get instant AI band scores.
              </p>
            </div>
          </header>

        {userId && (
          <div className="flex justify-end">
            <Link
              href="/progress"
              className="text-xs text-slate-500 underline-offset-2 hover:underline"
            >
              View your progress →
            </Link>
          </div>
        )}

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
            <div className="flex flex-col items-start gap-1">
              <Timer
                key={`${mode}-${task}-${duration}-${selectedTaskId}-${resetToken}`}
                initialSeconds={duration}
                isRunning={isRunning}
                onComplete={() => setIsRunning(false)}
              />
              <p className="text-[11px] text-slate-500">
                Minimum words for this task: <span className="font-medium">{minWords}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">

                {/* Pro toggle */}
                {(() => {
                  const isLocked = !userId || plan !== "pro";

                  return (
                    <label
                      className={`flex flex-col md:flex-row md:items-center gap-1 md:gap-2 text-xs text-slate-600 ${isLocked ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isPro}
                          disabled={isLocked || planLoading}
                          onChange={(e) => setIsPro(e.target.checked)}
                          className="h-4 w-4"
                        />
                        <span>
                          Use{" "}
                          <span className="font-semibold">Pro scoring</span>{" "}
                          (gpt-4o)
                        </span>
                      </span>

                      <span className="text-[10px] text-slate-500">
                        {planLoading && "Checking your plan…"}
                        {!planLoading && isLocked && !userId && (
                          <>Sign in and upgrade to unlock Pro scoring.</>
                        )}
                        {!planLoading && isLocked && userId && (
                          <>Upgrade to Pro to unlock GPT-4o scoring.</>
                        )}
                        {!planLoading && !isLocked && (
                          <>Pro active – GPT-4o scoring enabled.</>
                        )}
                      </span>

                      {planError && (
                        <span className="text-[10px] text-red-500">
                          {planError}
                        </span>
                      )}
                    </label>
                  );
                })()}

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
            Scoring model:{" "}
            {isPro
              ? "Pro (gpt-4o)"
              : "Free (gpt-4o-mini, suitable for practice)"}
            {" · "}
            Current plan:{" "}
            <span className="font-medium uppercase">{plan}</span>.
          </p>
        </Card>

        {/* QUESTION + ESSAY */}
        <Card className="p-4 space-y-4">
          {/* QUESTION SELECTOR */}
          <div className="space-y-2">
            <Label>Question</Label>
            <Select
              value={selectedTask?.id ?? ""}
              onValueChange={(id) => {
                setSelectedTaskId(id);
                setIsRunning(false);
                setResetToken(t => t + 1);
                resetFeedback();
                setEssay('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a question" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title ??
                      t.prompt.slice(0, 60) +
                      (t.prompt.length > 60 ? "…" : "")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* QUESTION PANEL */}
          {selectedTask && (
            <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-700 space-y-3">
              {/* Diagram / Chart description for Task 1 */}
              {selectedTask.task_type.startsWith("task1_") &&
                (selectedTask as any).diagram_alt && (
                  <div className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-600">
                    <strong>Diagram description:</strong>{" "}
                    {(selectedTask as any).diagram_alt}
                  </div>
                )}

              {/* Meta row: module, task, min words, kind */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
                <span className="rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-700">
                  {mode === "academic" ? "Academic" : "General Training"}
                </span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-700">
                  {task === "task1"
                    ? `Task 1 • ${minWords} words`
                    : `Task 2 • ${minWords} words`}
                </span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">
                  {selectedTask.task_type.startsWith("task2_")
                    ? "Essay"
                    : selectedTask.task_type === "task1_general"
                      ? "Letter"
                      : "Chart / Diagram"}
                </span>
              </div>

              <div>
                <strong>Question:</strong> {selectedTask.prompt}
              </div>
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

          <p className="text-xs text-slate-500" suppressHydrationWarning>
            Current words: {currentWordCount} / minimum {minWords}
          </p>

          {/* AUTOSAVE STATUS LINE */}
          <p className="text-xs text-slate-500" suppressHydrationWarning>
            {!userId && (
              <>Cloud autosave is off (not logged in). Local backup is still active in this browser.</>
            )}

            {userId && !selectedTaskId && (
              <>Select a task to enable cloud autosave.</>
            )}

            {userId && selectedTaskId && autosaveStatus === "saving" && (
              <>Saving draft…</>
            )}

            {userId && selectedTaskId && autosaveStatus === "saved" && lastSavedAt && (
              <>
                Saved at{" "}
                {new Date(lastSavedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </>
            )}

            {userId && selectedTaskId && autosaveStatus === "error" && (
              <>Autosave failed — changes are not yet saved in the cloud.</>
            )}
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

        {/* RESULTS PANEL */}
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
