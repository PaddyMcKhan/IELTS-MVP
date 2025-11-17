// src/hooks/useEssayAutosave.ts
"use client";

import { useEffect, useState, useRef } from "react";

interface UseEssayAutosaveOptions {
  taskType: "task1" | "task2";
  questionText: string;
  enabled?: boolean;
}

interface UseEssayAutosaveResult {
  value: string;
  setValue: (v: string) => void;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  lastSavedAt: Date | null;
  clearDraft: () => void;
}

function makeStorageKey(taskType: string, questionText: string) {
  // Keep key short but (reasonably) unique per question
  const snippet = questionText.slice(0, 80).replace(/\s+/g, " ").trim();
  return `ielts-essay-draft::${taskType}::${snippet}`;
}

export function useEssayAutosave(
  options: UseEssayAutosaveOptions
): UseEssayAutosaveResult {
  const { taskType, questionText, enabled = true } = options;

  const storageKey = makeStorageKey(taskType, questionText);
  const [value, setValue] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // Load existing draft on mount
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          value: string;
          savedAt: string;
        };
        setValue(parsed.value || "");
        setLastSavedAt(parsed.savedAt ? new Date(parsed.savedAt) : null);
      }
    } catch (err) {
      console.error("Failed to restore essay draft:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, enabled]);

  // Save with debounce
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    // Clear any previous timeout
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    // Don’t spam localStorage – save 800ms after the last keystroke
    timeoutRef.current = window.setTimeout(() => {
      try {
        const payload = {
          value,
          savedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
        setLastSavedAt(new Date(payload.savedAt));
      } catch (err) {
        console.error("Failed to save essay draft:", err);
      }
    }, 800);

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [value, storageKey, enabled]);

  const onChange: UseEssayAutosaveResult["onChange"] = (e) => {
    setValue(e.target.value);
  };

  const clearDraft = () => {
    setValue("");
    setLastSavedAt(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
  };

  return {
    value,
    setValue,
    onChange,
    lastSavedAt,
    clearDraft,
  };
}
