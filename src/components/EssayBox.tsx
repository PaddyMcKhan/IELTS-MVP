'use client';
import { useMemo } from 'react';
import { Textarea } from "@/components/ui/textarea";

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export default function EssayBox({ value, onChange }: Props) {
  const words = useMemo(
    () => (value.trim() ? value.trim().split(/\s+/).length : 0),
    [value]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Write your essay here…</span>
        <span>Word count: <strong className="tabular-nums">{words}</strong></span>
      </div>
      <Textarea
        className="min-h-[360px] text-base"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your response…"
      />
    </div>
  );
}
