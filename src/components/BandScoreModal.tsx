'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type BandScoreModalProps = {
  task: 'task1' | 'task2';
  wordCount: number;
  essay: string;
  aiData: any;
  onClose: () => void;
};

type Scores = {
  taskResponse: number;
  coherence: number;
  lexical: number;
  grammar: number;
};

function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

export default function BandScoreModal({
  task,
  wordCount,
  essay,
  aiData,
  onClose
}: BandScoreModalProps) {

  const [scores, setScores] = useState<Scores>({
    taskResponse: 6,
    coherence: 6,
    lexical: 6,
    grammar: 6,
  });

  useEffect(() => {
    if (aiData) {
      setScores({
        taskResponse: aiData.taskResponse,
        coherence: aiData.coherence,
        lexical: aiData.lexical,
        grammar: aiData.grammar
      });
    }
  }, [aiData]);

  const overall = roundToHalf(
    (scores.taskResponse + scores.coherence + scores.lexical + scores.grammar) / 4
  );

  const minWords = task === 'task1' ? 150 : 250;

  const handleSlider = (field: keyof Scores, value: string) => {
    setScores((prev) => ({ ...prev, [field]: parseFloat(value) }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Band Score Preview</h2>
            <p className="text-xs text-slate-500">
              AI examiner scoring — practice estimate only.
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={onClose}>✕</Button>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm text-slate-600">
          <span><strong>Task:</strong> {task === 'task1' ? 'Task 1' : 'Task 2'}</span>
          <span><strong>Words:</strong> {wordCount} (min {minWords})</span>
        </div>

        {/* OVERALL BAND */}
        <div className="mb-6 rounded-md bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500">Estimated Overall Band</p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-4xl font-bold">{overall.toFixed(1)}</span>
            <span className="text-sm text-slate-600">
              (adjust sliders below)
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${(overall / 9) * 100}%` }}
            />
          </div>
        </div>

        {/* SLIDERS */}
        <div className="space-y-4 text-sm">

          {/* Task Response */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Task Response</Label>
              <span className="text-xs text-slate-500">Band {scores.taskResponse.toFixed(1)}</span>
            </div>

            <input
              type="range"
              min={0} max={9} step={0.5}
              value={scores.taskResponse}
              onChange={(e) => handleSlider("taskResponse", e.target.value)}
              className="mt-2 w-full"
            />

            <p className="mt-1 text-xs text-slate-600">{aiData.comments.taskResponse}</p>
          </div>

          {/* Coherence */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Coherence & Cohesion</Label>
              <span className="text-xs text-slate-500">Band {scores.coherence.toFixed(1)}</span>
            </div>

            <input
              type="range"
              min={0} max={9} step={0.5}
              value={scores.coherence}
              onChange={(e) => handleSlider("coherence", e.target.value)}
              className="mt-2 w-full"
            />

            <p className="mt-1 text-xs text-slate-600">{aiData.comments.coherence}</p>
          </div>

          {/* Lexical Resource */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Lexical Resource</Label>
              <span className="text-xs text-slate-500">Band {scores.lexical.toFixed(1)}</span>
            </div>

            <input
              type="range"
              min={0} max={9} step={0.5}
              value={scores.lexical}
              onChange={(e) => handleSlider("lexical", e.target.value)}
              className="mt-2 w-full"
            />

            <p className="mt-1 text-xs text-slate-600">{aiData.comments.lexical}</p>
          </div>

          {/* Grammar */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Grammatical Range & Accuracy</Label>
              <span className="text-xs text-slate-500">Band {scores.grammar.toFixed(1)}</span>
            </div>

            <input
              type="range"
              min={0} max={9} step={0.5}
              value={scores.grammar}
              onChange={(e) => handleSlider("grammar", e.target.value)}
              className="mt-2 w-full"
            />

            <p className="mt-1 text-xs text-slate-600">{aiData.comments.grammar}</p>
          </div>

        </div>

        {/* AI COMMENTS */}
        <div className="mt-6 space-y-4 text-sm">
          <h3 className="text-sm font-semibold">AI Examiner Comments</h3>

          <div className="rounded-md bg-slate-50 p-3">
            <p><strong>Overview:</strong> {aiData.comments.overview}</p>
          </div>

          <div className="rounded-md bg-slate-50 p-3">
            <p><strong>Advice to Improve:</strong> {aiData.comments.advice}</p>
          </div>
        </div>

        <div className="mt-6 text-right">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
