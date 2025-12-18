"use server";

import { createClient } from "@/utils/supabase/server";

export async function saveEssayAttempt({
  questionId,
  essay,
  score,
}: {
  questionId: string;
  essay: string;
  score: any;
}) {
  const supabase = createClient();

  // ✅ Supabase server auth (replaces NextAuth session)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Supabase auth error:", userError);
    throw new Error("Not authenticated");
  }

  if (!user?.id) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase.from("essay_attempts").insert({
    user_id: user.id,          // ✅ same meaning as session.user.id
    question_id: questionId,   // ✅ unchanged
    essay_text: essay,         // ✅ unchanged
    score_json: score,         // ✅ unchanged
  });

  if (error) {
    console.error("Supabase save error:", error);
    throw new Error("Failed to save essay attempt.");
  }

  return { success: true };
}
