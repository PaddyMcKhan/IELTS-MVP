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
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50), 1), 200);

  const plan = await fetchPlan(user?.id);

  const { data, error } = await supabase
    .from("speaking_attempts")
    .select(
      "id,user_id,part,question_id,duration_seconds,audio_path,transcript,notes,created_at,model,overall_band,score_json"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const attempts = (data ?? []).map((row: any) => ({
    ...row,
    part: safePart(row.part),
  }));

  return NextResponse.json({ plan, attempts });
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
