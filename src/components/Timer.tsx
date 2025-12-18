'use client';

import { useEffect, useRef, useState } from 'react';

type TimerProps = {
  initialSeconds: number;
  isRunning: boolean;
  onComplete?: () => void;
};

export default function Timer({ initialSeconds, isRunning, onComplete }: TimerProps) {
  const [remaining, setRemaining] = useState(initialSeconds);

  // Ensure we only fire onComplete once per countdown run
  const didCompleteRef = useRef(false);

  // Reset remaining whenever the configured duration changes
  useEffect(() => {
    setRemaining(initialSeconds);
    didCompleteRef.current = false;
  }, [initialSeconds]);

  // Tick down while running
  useEffect(() => {
    if (!isRunning) return;
    if (remaining <= 0) return;

    const id = window.setInterval(() => {
      setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(id);
  }, [isRunning, remaining]);

  // Fire completion callback safely (not inside setState)
  useEffect(() => {
    if (!isRunning) return;
    if (remaining !== 0) return;
    if (didCompleteRef.current) return;

    didCompleteRef.current = true;

    // Defer to next tick to avoid "setState while rendering" warnings upstream
    window.setTimeout(() => {
      onComplete?.();
    }, 0);
  }, [remaining, isRunning, onComplete]);

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');

  return (
    <div className="text-lg tabular-nums font-medium" aria-live="polite">
      ⏱️ {mins}:{secs}
    </div>
  );
}
