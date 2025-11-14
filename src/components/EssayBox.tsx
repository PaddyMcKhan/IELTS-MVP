'use client';
import { useMemo, useState } from 'react';
import { Textarea } from "@/components/ui/textarea";

export default function EssayBox() {
  const [text, setText] = useState('');
  const words = useMemo(
    () => (text.trim() ? text.trim().split(/\s+/).length : 0),
    [text]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Write your essay here…</span>
        <span>Word count: <strong className="tabular-nums">{words}</strong></span>
      </div>
      <Textarea
        className="min-h-[360px] text-base"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your response…"
      />
    </div>
  );
}
