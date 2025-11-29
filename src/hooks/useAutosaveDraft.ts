// src/hooks/useAutosaveDraft.ts
"use client";

import { useEffect, useRef, useState } from "react";

export type EssayMode = "academic" | "general";
export type EssayTask = "task1" | "task2";

type AutosaveStatus = "idle" | "saving" | "saved" | "error";

type UseAutosaveDraftProps = {
  essay: string;
  questionId?: string | null;
  mode: EssayMode;
  task: EssayTask;
  enabled: boolean;        // only true when user is logged in & question selected
  userId?: string | null;  // NEW: we pass this to the API
  delayMs?: number;
};

export function useAutosaveDraft({
  essay,
  questionId,
  mode,
  task,
  enabled,
  userId,
  delayMs = 3000,
}: UseAutosaveDraftProps) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const lastSavedTextRef = useRef<string>("");

  useEffect(() => {
    if (!enabled) return;
    if (!questionId) return;
    if (!userId) return;

    if (essay === lastSavedTextRef.current) return;

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      try {
        setStatus("saving");

        const res = await fetch("/api/drafts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            questionId,
            mode,
            task,
            essay,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          console.error("Autosave failed with status:", res.status);
          setStatus("error");
          return;
        }

        const data = (await res.json()) as { id: string; updatedAt: string };
        lastSavedTextRef.current = essay;
        setLastSavedAt(data.updatedAt);
        setStatus("saved");
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return;
        }
        console.error("Autosave error:", err);
        setStatus("error");
      }
    }, delayMs);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [essay, questionId, mode, task, enabled, userId, delayMs]);

  return { status, lastSavedAt };
}
