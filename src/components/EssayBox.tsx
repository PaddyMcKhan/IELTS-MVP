'use client';
import { useEffect, useMemo, useState } from 'react';
import { Textarea } from "@/components/ui/textarea";

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export default function EssayBox({ value, onChange }: Props) {
  const [hydrated, setHydrated] = useState(false);

  // Mark when we are safely running on the client
  useEffect(() => {
    setHydrated(true);
  }, []);

  const words = useMemo(
    () => (value.trim() ? value.trim().split(/\s+/).length : 0),
    [value]
  );

  // Before hydration, just show 0 to avoid mismatch
  const displayWords = hydrated ? words : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Write your essay here…</span>
        <span>
          Word count:{' '}
          <strong
            className="tabular-nums"
            suppressHydrationWarning
          >
            {displayWords}
          </strong>
        </span>
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
