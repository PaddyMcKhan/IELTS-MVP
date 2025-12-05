"use client";

import { useEffect, useState } from "react";

export type WritingTaskRow = {
  id: string;
  task_type: string;
  title: string | null;
  prompt: string;
  diagram_alt: string | null;
  diagram_image_url: string | null;
  min_words: number;
  is_active: boolean;
};

type UseWritingTasksResult = {
  tasks: WritingTaskRow[];
  loading: boolean;
  error: string | null;
};

export function useWritingTasks(taskType: string): UseWritingTasksResult {
  const [tasks, setTasks] = useState<WritingTaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskType) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/writing-tasks?task_type=${encodeURIComponent(taskType)}`
        );
        const json = await res.json();

        if (!res.ok || json.error) {
          if (!cancelled) {
            setError(json.error || "Failed to load writing tasks");
            setTasks([]);
          }
          return;
        }

        if (!cancelled) {
          setTasks((json.tasks ?? []) as WritingTaskRow[]);
        }
      } catch (err) {
        console.error("Error loading writing tasks:", err);
        if (!cancelled) {
          setError("Failed to load writing tasks");
          setTasks([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [taskType]);

  return { tasks, loading, error };
}
