"use server";

import { createClient } from "@/utils/supabase/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

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
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase.from("essay_attempts").insert({
    user_id: session.user.id,
    question_id: questionId,
    essay_text: essay,
    score_json: score,
  });

  if (error) {
    console.error("Supabase save error:", error);
    throw new Error("Failed to save essay attempt.");
  }

  return { success: true };
}
