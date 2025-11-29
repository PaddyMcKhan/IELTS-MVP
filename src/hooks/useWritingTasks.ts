"use client";

import { useEffect, useState } from "react";

export type WritingTask = {
  id: string;
  task_type: string;
  title: string | null;
  prompt: string;
  diagram_alt: string | null;
  diagram_image_url: string | null;
  min_words: number;
  is_active?: boolean;
  created_at?: string;
};

export function useWritingTasks(taskType?: string) {
  const [tasks, setTasks] = useState<WritingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = taskType
          ? `/api/writing-tasks?task_type=${encodeURIComponent(taskType)}`
          : "/api/writing-tasks";

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch tasks");

        const json = await res.json();
        if (!cancelled) {
          setTasks(json.tasks ?? []);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message ?? "Error loading tasks");
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
