'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type BandScoreModalProps = {
  task: 'task1' | 'task2';
  wordCount: number;
  essay: string;
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

function commentFor(category: keyof Scores, band: number): string {
  if (band < 5) {
    switch (category) {
      case 'taskResponse':
        return 'Does not fully address the task; ideas are limited or unclear.';
      case 'coherence':
        return 'Ideas are hard to follow; linking and paragraphing are weak.';
      case 'lexical':
        return 'Limited range of vocabulary with noticeable repetition and errors.';
      case 'grammar':
        return 'Frequent grammatical errors that may cause confusion.';
    }
  } else if (band < 7) {
    switch (category) {
      case 'taskResponse':
        return 'Addresses the task but may miss some key points or development.';
      case 'coherence':
        return 'Generally coherent with some issues in organisation or linking.';
      case 'lexical':
        return 'Adequate range of vocabulary with some inaccuracy or repetition.';
      case 'grammar':
        return 'A mix of simple and more complex sentences; errors are noticeable but rarely cause misunderstanding.';
    }
  } else {
    switch (category) {
      case 'taskResponse':
        return 'Fully addresses all parts of the task with well-developed ideas.';
      case 'coherence':
        return 'Logically organised with clear progression and effective linking.';
      case 'lexical':
        return 'Wide range of vocabulary used naturally and accurately.';
      case 'grammar':
        return 'Flexible and accurate use of a range of grammar structures.';
    }
  }
}

// Very simple heuristic just to pre-fill sliders.
// Later we will replace this with real AI scoring.
function computeInitialScores(task: 'task1' | 'task2', wordCount: number, essay: string): Scores {
  const minWords = task === 'task1' ? 150 : 250;
  const ratio = minWords > 0 ? wordCount / minWords : 0;

  let taskResponse: number;
  if (ratio < 0.5) taskResponse = 4;
  else if (ratio < 0.8) taskResponse = 5;
  else if (ratio < 1.0) taskResponse = 6;
  else if (ratio < 1.3) taskResponse = 7;
  else taskResponse = 8;

  // Very basic proxies for the other bands (placeholder)
  const lengthBonus = Math.min(1, Math.max(0, (wordCount - minWords) / minWords));
  const baseBand = 6 + lengthBonus; // 6.0–7.0

  const coherence = baseBand;
  const lexical = baseBand;
  const grammar = baseBand;

  return {
    taskResponse,
    coherence,
    lexical,
    grammar,
  };
}

export default function BandScoreModal({ task, wordCount, essay, onClose }: BandScoreModalProps) {
  const [scores, setScores] = useState<Scores>({
    taskResponse: 6,
    coherence: 6,
    lexical: 6,
    grammar: 6,
  });

  // Initialise scores when modal opens / essay changes
  useEffect(() => {
    const initial = computeInitialScores(task, wordCount, essay);
    setScores(initial);
  }, [task, wordCount, essay]);

  const overall = roundToHalf(
    (scores.taskResponse + scores.coherence + scores.lexical + scores.grammar) / 4
  );

  const minWords = task === 'task1' ? 150 : 250;

  const handleSliderChange = (field: keyof Scores, value: string) => {
    const num = parseFloat(value);
    setScores((prev) => ({ ...prev, [field]: num }));
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
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Band Score Preview</h2>
            <p className="text-xs text-slate-500">
              This is a practice-only estimate. Official IELTS scores may differ.
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            Task: <strong>{task === 'task1' ? 'Task 1' : 'Task 2'}</strong>
          </span>
          <span>
            Words: <strong>{wordCount}</strong> (recommended minimum {minWords})
          </span>
        </div>

        <div className="mb-6 rounded-md bg-slate-50 p-4">
          <p className="text-xs uppercase text-slate-500">Estimated Overall Band</p>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-4xl font-bold">{overall.toFixed(1)}</span>
            <span className="text-sm text-slate-600">
              Average of the four IELTS Writing criteria
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${(overall / 9) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-4 text-sm">
          {/* Task Response */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Task Response</Label>
              <span className="text-xs text-slate-500">Band {scores.taskResponse.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={9}
              step={0.5}
              value={scores.taskResponse}
              onChange={(e) => handleSliderChange('taskResponse', e.target.value)}
              className="mt-2 w-full"
            />
            <p className="mt-1 text-xs text-slate-600">
              {commentFor('taskResponse', scores.taskResponse)}
            </p>
          </div>

          {/* Coherence & Cohesion */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Coherence & Cohesion</Label>
              <span className="text-xs text-slate-500">Band {scores.coherence.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={9}
              step={0.5}
              value={scores.coherence}
              onChange={(e) => handleSliderChange('coherence', e.target.value)}
              className="mt-2 w-full"
            />
            <p className="mt-1 text-xs text-slate-600">
              {commentFor('coherence', scores.coherence)}
            </p>
          </div>

          {/* Lexical Resource */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Lexical Resource</Label>
              <span className="text-xs text-slate-500">Band {scores.lexical.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={9}
              step={0.5}
              value={scores.lexical}
              onChange={(e) => handleSliderChange('lexical', e.target.value)}
              className="mt-2 w-full"
            />
            <p className="mt-1 text-xs text-slate-600">
              {commentFor('lexical', scores.lexical)}
            </p>
          </div>

          {/* Grammar */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Grammatical Range & Accuracy</Label>
              <span className="text-xs text-slate-500">Band {scores.grammar.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={9}
              step={0.5}
              value={scores.grammar}
              onChange={(e) => handleSliderChange('grammar', e.target.value)}
              className="mt-2 w-full"
            />
            <p className="mt-1 text-xs text-slate-600">
              {commentFor('grammar', scores.grammar)}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
