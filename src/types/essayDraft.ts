// src/types/essayDraft.ts

export type EssayMode = 'academic' | 'general';
export type EssayTask = 'task1' | 'task2';

export type EssayDraft = {
  id: string;
  user_id: string;
  question_id: string;
  mode: EssayMode;
  task: EssayTask;
  essay_text: string;
  updated_at: string; // ISO timestamp from Supabase
};
