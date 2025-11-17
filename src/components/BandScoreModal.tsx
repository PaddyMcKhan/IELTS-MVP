'use client';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Scores = {
  taskResponse: number;
  coherence: number;
  lexical: number;
  grammar: number;
};

type BandScoreModalProps = {
  task: 'task1' | 'task2';
  wordCount: number;
  minWords: number;
  aiData: any;
  prediction: Scores | null;
  isPro: boolean;
  onClose: () => void;
};

function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

export default function BandScoreModal({
  task,
  wordCount,
  minWords,
  aiData,
  prediction,
  isPro,
  onClose,
}: BandScoreModalProps) {
  const aiOverall =
    typeof aiData.overall === 'number'
      ? aiData.overall
      : roundToHalf(
          (aiData.taskResponse +
            aiData.coherence +
            aiData.lexical +
            aiData.grammar) /
          4
        );

  let predictedOverall: number | null = null;
  if (prediction) {
    predictedOverall = roundToHalf(
      (prediction.taskResponse +
        prediction.coherence +
        prediction.lexical +
        prediction.grammar) /
      4
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Band Score Results</h2>
          <p className="text-xs text-slate-500">
            AI examiner scoring — practice estimate only. Model:{' '}
            {isPro ? 'Pro (gpt-4o)' : 'Free (gpt-4o-mini)'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
        >
          Hide feedback
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <span>
          <strong>Task:</strong> {task === 'task1' ? 'Task 1' : 'Task 2'}
        </span>
        <span>
          <strong>Words:</strong> {wordCount} (min {minWords})
        </span>
      </div>

      {/* Overall bands */}
      <div className="grid gap-4 md:grid-cols-2">
        {prediction && predictedOverall !== null ? (
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">Your predicted overall band</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-semibold">
                {predictedOverall.toFixed(1)}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">Your prediction</p>
            <p className="mt-1 text-xs text-slate-500">
              No prediction recorded for this attempt.
            </p>
          </div>
        )}

        <div className="rounded-md bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500">AI examiner overall band</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-bold">{aiOverall.toFixed(1)}</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${(aiOverall / 9) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Criterion comparison table */}
      <div className="overflow-x-auto text-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b text-xs text-slate-500">
              <th className="py-2 pr-3">Criterion</th>
              <th className="py-2 pr-3">
                Your prediction
              </th>
              <th className="py-2 pr-3">
                AI examiner band
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b align-top">
              <td className="py-2 pr-3 font-medium">Task Response</td>
              <td className="py-2 pr-3 text-slate-600">
                {prediction ? prediction.taskResponse.toFixed(1) : '—'}
              </td>
              <td className="py-2 pr-3 text-slate-900">
                {aiData.taskResponse.toFixed(1)}
                <p className="mt-1 text-xs text-slate-600">
                  {aiData.comments?.taskResponse}
                </p>
              </td>
            </tr>
            <tr className="border-b align-top">
              <td className="py-2 pr-3 font-medium">Coherence & Cohesion</td>
              <td className="py-2 pr-3 text-slate-600">
                {prediction ? prediction.coherence.toFixed(1) : '—'}
              </td>
              <td className="py-2 pr-3 text-slate-900">
                {aiData.coherence.toFixed(1)}
                <p className="mt-1 text-xs text-slate-600">
                  {aiData.comments?.coherence}
                </p>
              </td>
            </tr>
            <tr className="border-b align-top">
              <td className="py-2 pr-3 font-medium">Lexical Resource</td>
              <td className="py-2 pr-3 text-slate-600">
                {prediction ? prediction.lexical.toFixed(1) : '—'}
              </td>
              <td className="py-2 pr-3 text-slate-900">
                {aiData.lexical.toFixed(1)}
                <p className="mt-1 text-xs text-slate-600">
                  {aiData.comments?.lexical}
                </p>
              </td>
            </tr>
            <tr className="align-top">
              <td className="py-2 pr-3 font-medium">Grammar Range & Accuracy</td>
              <td className="py-2 pr-3 text-slate-600">
                {prediction ? prediction.grammar.toFixed(1) : '—'}
              </td>
              <td className="py-2 pr-3 text-slate-900">
                {aiData.grammar.toFixed(1)}
                <p className="mt-1 text-xs text-slate-600">
                  {aiData.comments?.grammar}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Overview + Advice */}
      <div className="space-y-3 text-sm">
        <div className="rounded-md bg-slate-50 p-3">
          <p>
            <strong>Overview:</strong>{' '}
            <span className="text-slate-700">
              {aiData.comments?.overview}
            </span>
          </p>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <p>
            <strong>Advice to Improve:</strong>{' '}
            <span className="text-slate-700">
              {aiData.comments?.advice}
            </span>
          </p>
        </div>
      </div>
    </Card>
  );
}
