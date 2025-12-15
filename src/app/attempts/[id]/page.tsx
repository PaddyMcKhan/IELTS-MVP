// src/app/attempts/[id]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TASKS } from "@/data/tasks";
import PageShell from "@/components/layout/PageShell";

// In this Next.js version, `params` is a Promise
type PageProps = {
  params: Promise<{ id: string }>;
};

type AttemptRow = {
  id: string;
  user_id: string | null;
  question_id: string | null;
  question_text: string | null;
  module: string | null;
  task: string | null;
  essay_text: string | null;
  score_json: any | null;
  created_at: Date | string;
};

type HistoryRow = {
  id: string;
  user_id: string | null;
  question_id: string | null;
  score_json: any | null;
  created_at: Date | string;
};

export default async function AttemptDetailPage({ params }: PageProps) {
  const { id } = await params;

  // essay_attempts.id is TEXT in your DB now – no ::uuid cast
  const rows = await prisma.$queryRaw<AttemptRow[]>`
    select
      id,
      user_id,
      question_id,
      question_text,
      module,
      task,
      essay_text,
      score_json,
      created_at
    from essay_attempts
    where id = ${id}
    limit 1
  `;

  const attempt = rows[0];
  if (!attempt) {
    notFound();
  }

  const createdAt =
    attempt.created_at instanceof Date
      ? attempt.created_at
      : new Date(attempt.created_at);

  // All attempts for this user on the same question – for history
  let history: HistoryRow[] = [];
  if (attempt.user_id && attempt.question_id) {
    history = await prisma.$queryRaw<HistoryRow[]>`
      select id, user_id, question_id, score_json, created_at
      from essay_attempts
      where user_id = ${attempt.user_id}
        and question_id = ${attempt.question_id}
      order by created_at asc
    `;
  }

  const totalAttemptsForQuestion = history.length;
  const currentIndexInHistory = history.findIndex(
    (h) => h.id === attempt.id
  );
  const attemptNumberForThisQuestion =
    currentIndexInHistory === -1 ? null : currentIndexInHistory + 1;

  // Try to find matching task from TASKS for richer metadata (fallback only)
  const questionFromTasks = attempt.question_id
    ? TASKS.find((t) => String(t.id) === String(attempt.question_id))
    : undefined;

  // === Derive meta labels (module / task / prompt) ===
  const rawModule = attempt.module ?? questionFromTasks?.module ?? null;
  const moduleLabel =
    rawModule === "academic"
      ? "Academic"
      : rawModule === "general"
      ? "General"
      : rawModule;

  const rawTask = attempt.task ?? questionFromTasks?.task ?? null;
  const taskLabel =
    rawTask === "task1"
      ? "Task 1"
      : rawTask === "task2"
      ? "Task 2"
      : rawTask;

  const promptText =
    attempt.question_text ?? questionFromTasks?.prompt ?? null;

  // Build “rewrite this question” href using the same pattern as Questions page
  const modeParam =
    rawModule === "academic" || rawModule === "general"
      ? rawModule
      : null;
  const taskParam =
    rawTask === "task1" || rawTask === "task2" ? rawTask : null;

  const practiceHref =
    attempt.question_id != null
      ? `/?question_id=${attempt.question_id}${
          modeParam ? `&mode=${modeParam}` : ""
        }${taskParam ? `&task=${taskParam}` : ""}`
      : null;

  // === Interpret score_json ===
  const score = attempt.score_json as any | null;

  const overall =
    typeof score?.overall === "number" ? score.overall : null;
  const grammar =
    typeof score?.grammar === "number" ? score.grammar : null;
  const lexical =
    typeof score?.lexical === "number" ? score.lexical : null;
  const coherence =
    typeof score?.coherence === "number" ? score.coherence : null;
  const taskResponse =
    typeof score?.taskResponse === "number"
      ? score.taskResponse
      : null;

  const comments = (score?.comments ?? {}) as Record<
    string,
    string | undefined
  >;

  const hasBandData =
    overall !== null ||
    grammar !== null ||
    lexical !== null ||
    coherence !== null ||
    taskResponse !== null;

  // === Prediction (sliders) inside score_json.prediction ===
  const prediction = score?.prediction as
    | {
        taskResponse?: number;
        coherence?: number;
        lexical?: number;
        grammar?: number;
      }
    | null
    | undefined;

  const pTaskResponse =
    typeof prediction?.taskResponse === "number"
      ? prediction.taskResponse
      : null;
  const pCoherence =
    typeof prediction?.coherence === "number"
      ? prediction.coherence
      : null;
  const pLexical =
    typeof prediction?.lexical === "number"
      ? prediction.lexical
      : null;
  const pGrammar =
    typeof prediction?.grammar === "number"
      ? prediction.grammar
      : null;

  let predictedOverall: number | null = null;
  if (
    pTaskResponse !== null &&
    pCoherence !== null &&
    pLexical !== null &&
    pGrammar !== null
  ) {
    const avg =
      (pTaskResponse + pCoherence + pLexical + pGrammar) / 4;
    predictedOverall = Math.round(avg * 2) / 2; // round to .5
  }

  const hasPrediction =
    predictedOverall !== null ||
    pTaskResponse !== null ||
    pCoherence !== null ||
    pLexical !== null ||
    pGrammar !== null;

  return (
    <PageShell className="bg-white text-slate-900">
      {/* HEADER */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Attempt details</h1>
          <p className="mt-1 text-xs text-slate-500">
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

      {/* QUESTION CONTEXT + REWRITE CTA */}
      {attempt.question_id && (
        <section className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-800">
                {moduleLabel && `${moduleLabel} • `}{" "}
                {taskLabel && `${taskLabel} • `}Q{attempt.question_id}
              </p>
              {attemptNumberForThisQuestion && totalAttemptsForQuestion > 1 && (
                <p className="text-[11px] text-slate-500">
                  This is your attempt {attemptNumberForThisQuestion} of{" "}
                  {totalAttemptsForQuestion} on this question.
                </p>
              )}
            </div>

            {practiceHref && (
              <Link
                href={practiceHref}
                className="text-[11px] font-semibold text-emerald-700 hover:underline"
              >
                Rewrite this question →
              </Link>
            )}
          </div>

          {history.length > 1 && (
            <div className="mt-3 text-[11px] text-slate-500">
              <p className="mb-1 font-semibold text-slate-700">
                Your attempts on this question
              </p>
              <ul className="space-y-1">
                {history.map((h) => {
                  const created =
                    h.created_at instanceof Date
                      ? h.created_at
                      : new Date(h.created_at);
                  const s = h.score_json as any;
                  const o =
                    typeof s?.overall === "number" ? s.overall : null;
                  const isCurrent = h.id === attempt.id;

                  return (
                    <li
                      key={h.id}
                      className="flex items-center justify-between"
                    >
                      <span>
                        {created.toLocaleDateString()}{" "}
                        {created.toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {isCurrent && " (current)"}
                      </span>
                      <span className="text-slate-700">
                        {o !== null ? `Band ${o.toFixed(1)}` : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* META BLOCK – SaaS style */}
      <section className="space-y-2 text-sm">
        <p className="text-slate-600">
          <span className="font-medium">Attempt ID:</span>{" "}
          {attempt.id}
        </p>
        {attempt.question_id && (
          <p className="text-slate-600">
            <span className="font-medium">Question ID:</span>{" "}
            {attempt.question_id}
          </p>
        )}

        {moduleLabel && (
          <p className="text-slate-600">
            <span className="font-medium">Module:</span>{" "}
            {moduleLabel}
          </p>
        )}

        {taskLabel && (
          <p className="text-slate-600">
            <span className="font-medium">Task:</span>{" "}
            {taskLabel}
          </p>
        )}

        {promptText && (
          <p className="text-slate-600">
            <span className="font-medium">Question prompt:</span>{" "}
            {promptText}
          </p>
        )}

        <p className="text-slate-600">
          <span className="font-medium">Created at:</span>{" "}
          {createdAt.toLocaleString()}
        </p>
      </section>

      {/* AI BAND SCORES */}
      {hasBandData && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">AI band scores</h2>
            <p className="mt-1 text-xs text-slate-500">
              These scores come from the AI examiner for this attempt.
            </p>
          </div>

          {/* Big overall card */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Overall band
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold">
                {overall !== null ? overall.toFixed(1) : "—"}
              </span>
            </div>
            {comments.overview && (
              <p className="mt-2 text-xs text-slate-600">
                {comments.overview}
              </p>
            )}
          </div>

          {/* Four criterion cards */}
          <div className="grid gap-3 md:grid-cols-4">
            <ScoreCard
              label="Task response"
              value={taskResponse}
              description={comments.taskResponse}
            />
            <ScoreCard
              label="Coherence & cohesion"
              value={coherence}
              description={comments.coherence}
            />
            <ScoreCard
              label="Lexical resource"
              value={lexical}
              description={comments.lexical}
            />
            <ScoreCard
              label="Grammar range & accuracy"
              value={grammar}
              description={comments.grammar}
            />
          </div>

          {/* Overall advice */}
          {comments.advice && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="mb-1 font-semibold uppercase text-amber-800">
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
            How your self-assessment compares with the AI examiner for
            this attempt.
          </p>

          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase text-slate-500">
                Your predicted overall band
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {predictedOverall !== null
                  ? predictedOverall.toFixed(1)
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase text-slate-500">
                AI examiner overall band
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {overall !== null ? overall.toFixed(1) : "—"}
              </p>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
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
              label="Grammar accuracy"
              predicted={pGrammar}
              actual={grammar}
            />
          </div>
        </section>
      )}

      {/* ESSAY */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your essay</h2>
        <div className="whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm text-slate-800">
          {attempt.essay_text ?? "No essay text stored for this attempt."}
        </div>
      </section>
    </PageShell>
  );
}

/** Small card for each criterion */
function ScoreCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number | null;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold">
        {value !== null ? value.toFixed(1) : "—"}
      </p>
      {description && (
        <p className="mt-2 text-xs text-slate-600">{description}</p>
      )}
    </div>
  );
}

/** Row for Prediction vs AI comparison */
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
