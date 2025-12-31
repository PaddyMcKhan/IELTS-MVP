import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type Plan = "pro" | "free";
type Part = "part1" | "part2" | "part3" | "unknown";

function safePart(v: unknown): Part {
  return v === "part1" || v === "part2" || v === "part3" ? v : "unknown";
}

async function fetchPlan(userId?: string): Promise<Plan> {
  if (!userId) return "free";

  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("user_profiles")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();

    return data?.plan === "pro" ? "pro" : "free";
  } catch {
    return "free";
  }
}

/* =========================
   GET /api/speaking/attempts
   ========================= */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    // 🔒 HARD GATE
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("speaking_attempts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading speaking attempts:", error);
      return NextResponse.json(
        { error: "Failed to load attempts" },
        { status: 500 }
      );
    }

    return NextResponse.json({ attempts: data ?? [] });
  } catch (err) {
    console.error("Unexpected error in GET /api/speaking/attempts:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}

/* =========================
   POST /api/speaking/attempts
   ========================= */
export async function POST(req: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();

  const {
    part,
    questionId,
    durationSeconds,
    audioPath,
    transcript,
    notes,
    model,
    overallBand,
    scoreJson,
  } = body;

  const { error } = await supabase.from("speaking_attempts").insert({
    user_id: user.id,
    part: safePart(part),
    question_id: questionId,
    duration_seconds: durationSeconds,
    audio_path: audioPath,
    transcript,
    notes,
    model,
    overall_band: overallBand,
    score_json: scoreJson,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
