// src/app/attempts/[id]/page.tsx

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TASKS } from "@/data/tasks";

// In this Next.js version, `params` is a Promise
type PageProps = {
  params: Promise<{ id: string }>;
};

type AttemptRow = {
  id: string;
  user_id: string | null;
  question_id: string;
  essay_text: string;
  score_json: any;
  created_at: Date;
};

export default async function AttemptDetailPage({ params }: PageProps) {
  const { id } = await params;

  const rows = await prisma.$queryRaw<AttemptRow[]>`
    select id, user_id, question_id, essay_text, score_json, created_at
    from essay_attempts
    where id = ${id}::uuid
    limit 1
  `;

  const attempt = rows[0];

  if (!attempt) {
    notFound();
  }

  const question = TASKS.find((t) => t.id === attempt.question_id);
  const createdAt = new Date(attempt.created_at);

  // AI score JSON (typed loosely)
  const score = attempt.score_json as any | null;

  const overall = typeof score?.overall === "number" ? score.overall : null;
  const grammar = typeof score?.grammar === "number" ? score.grammar : null;
  const lexical = typeof score?.lexical === "number" ? score.lexical : null;
  const coherence =
    typeof score?.coherence === "number" ? score.coherence : null;
  const taskResponse =
    typeof score?.taskResponse === "number" ? score.taskResponse : null;
  const modeUsed =
    typeof score?.modeUsed === "string" ? score.modeUsed : undefined;

  const comments = (score?.comments ?? {}) as Record<string, string | undefined>;

  const hasBandData =
    overall !== null ||
    grammar !== null ||
    lexical !== null ||
    coherence !== null ||
    taskResponse !== null;

  // Prediction vs AI (from stored sliders)
  const prediction = score?.prediction as any | null;

  const pTaskResponse =
    typeof prediction?.taskResponse === "number" ? prediction.taskResponse : null;
  const pCoherence =
    typeof prediction?.coherence === "number" ? prediction.coherence : null;
  const pLexical =
    typeof prediction?.lexical === "number" ? prediction.lexical : null;
  const pGrammar =
    typeof prediction?.grammar === "number" ? prediction.grammar : null;

  let predictedOverall: number | null = null;
  if (
    pTaskResponse !== null &&
    pCoherence !== null &&
    pLexical !== null &&
    pGrammar !== null
  ) {
    const avg = (pTaskResponse + pCoherence + pLexical + pGrammar) / 4;
    predictedOverall = Math.round(avg * 2) / 2; // round to .5
  }

  const hasPrediction =
    predictedOverall !== null ||
    pTaskResponse !== null ||
    pCoherence !== null ||
    pLexical !== null ||
    pGrammar !== null;

  return (
    <main className="min-h-dvh bg-white text-slate-900 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* HEADER */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Attempt details</h1>
            <p className="text-xs text-slate-500 mt-1">
              Review your essay and AI feedback for this attempt.
            </p>
          </div>
          <Link
            href="/attempts"
            className="text-xs text-blue-600 hover:underline"
          >
            ← Back to attempts
          </Link>
        </header>

        {/* META */}
        <section className="space-y-2 text-sm">
          <p className="text-slate-600">
            <span className="font-medium">Attempt ID:</span> {attempt.id}
          </p>
          <p className="text-slate-600">
            <span className="font-medium">Question ID:</span>{" "}
            {attempt.question_id}
          </p>
          {question && (
            <>
              <p className="text-slate-600">
                <span className="font-medium">Module:</span>{" "}
                {question.module === "academic" ? "Academic" : "General"}
              </p>
              <p className="text-slate-600">
                <span className="font-medium">Task:</span>{" "}
                {question.task === "task1" ? "Task 1" : "Task 2"}
              </p>
              <p className="text-slate-600">
                <span className="font-medium">Question prompt:</span>{" "}
                {question.prompt}
              </p>
            </>
          )}
          <p className="text-slate-600">
            <span className="font-medium">Created at:</span>{" "}
            {createdAt.toLocaleString()}
          </p>
        </section>

        {/* AI BAND SCORE CARD */}
        {hasBandData && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">AI band scores</h2>
                <p className="text-xs text-slate-500">
                  These scores come from the AI examiner for this attempt.
                </p>
              </div>
              {modeUsed && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                  Model: {modeUsed}
                </span>
              )}
            </div>

            {/* Overall card on its own row */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex flex-col justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-xs uppercase text-slate-500">
                  Overall band
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-semibold">
                  {overall !== null ? overall.toFixed(1) : "—"}
                </span>
              </div>
              {comments.overview && (
                <p className="mt-2 text-xs text-slate-600">
                  {comments.overview}
                </p>
              )}
            </div>

            {/* Four small cards on the row below, even on wide screens */}
            <div className="grid gap-3 md:grid-cols-4">
              {/* Task response */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-500">
                  Task response
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {taskResponse !== null ? taskResponse.toFixed(1) : "—"}
                </p>
                {comments.taskResponse && (
                  <p className="mt-2 text-xs text-slate-600">
                    {comments.taskResponse}
                  </p>
                )}
              </div>

              {/* Coherence */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-500">
                  Coherence & cohesion
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {coherence !== null ? coherence.toFixed(1) : "—"}
                </p>
                {comments.coherence && (
                  <p className="mt-2 text-xs text-slate-600">
                    {comments.coherence}
                  </p>
                )}
              </div>

              {/* Lexical */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-500">
                  Lexical resource
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {lexical !== null ? lexical.toFixed(1) : "—"}
                </p>
                {comments.lexical && (
                  <p className="mt-2 text-xs text-slate-600">
                    {comments.lexical}
                  </p>
                )}
              </div>

              {/* Grammar */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-500">
                  Grammar range & accuracy
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {grammar !== null ? grammar.toFixed(1) : "—"}
                </p>
                {comments.grammar && (
                  <p className="mt-2 text-xs text-slate-600">
                    {comments.grammar}
                  </p>
                )}
              </div>
            </div>

            {comments.advice && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-semibold text-xs uppercase mb-1">
                  Overall advice
                </p>
                <p>{comments.advice}</p>
              </div>
            )}
          </section>
        )}

        {/* PREDICTION VS AI */}
        {hasPrediction && hasBandData && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Prediction vs AI</h2>
            <p className="text-xs text-slate-500">
              How your self-assessment compares with the AI examiner for this attempt.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              {/* Overall comparison */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase text-slate-500">
                  Overall band
                </p>
                <div className="mt-2 flex items-baseline gap-6">
                  <div>
                    <p className="text-[11px] uppercase text-slate-500">
                      Your prediction
                    </p>
                    <p className="text-2xl font-semibold">
                      {predictedOverall !== null
                        ? predictedOverall.toFixed(1)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase text-slate-500">
                      AI score
                    </p>
                    <p className="text-2xl font-semibold">
                      {overall !== null ? overall.toFixed(1) : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Criteria comparison */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="text-[11px] uppercase text-slate-500 mb-2">
                  By criterion
                </p>
                <div className="space-y-1">
                  <Row
                    label="Task response"
                    predicted={pTaskResponse}
                    actual={taskResponse}
                  />
                  <Row
                    label="Coherence & cohesion"
                    predicted={pCoherence}
                    actual={coherence}
                  />
                  <Row
                    label="Lexical resource"
                    predicted={pLexical}
                    actual={lexical}
                  />
                  <Row
                    label="Grammar"
                    predicted={pGrammar}
                    actual={grammar}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* YOUR ESSAY */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Your essay</h2>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm whitespace-pre-wrap">
            {attempt.essay_text}
          </div>
        </section>
      </div>
    </main>
  );
}

/**
 * Small helper row for the prediction vs AI card
 */
function Row({
  label,
  predicted,
  actual,
}: {
  label: string;
  predicted: number | null;
  actual: number | null;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className="text-slate-800">
        {predicted !== null ? predicted.toFixed(1) : "—"}{" "}
        <span className="text-slate-400">→</span>{" "}
        {actual !== null ? actual.toFixed(1) : "—"}
      </span>
    </div>
  );
}
