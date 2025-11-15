'use client';
import { useEffect, useState } from 'react';

type TimerProps = {
  initialSeconds: number;
  isRunning: boolean;
  onComplete?: () => void;
};

export default function Timer({ initialSeconds, isRunning, onComplete }: TimerProps) {
  const [remaining, setRemaining] = useState(initialSeconds);

  // Reset remaining whenever the configured duration changes
  useEffect(() => {
    setRemaining(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning) return;

    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [isRunning, onComplete]);

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');

  return (
    <div className="text-lg tabular-nums font-medium" aria-live="polite">
      ⏱️ {mins}:{secs}
    </div>
  );
}
