// src/app/api/speaking/attempts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase setup (MATCHES writing /api/attempts)
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  "";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "";

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Plan check (MATCHES latest writing /api/score)
async function getUserPlan(userId: string | null | undefined) {
  if (!supabase || !userId) return "free" as const;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("plan, pro_until")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return "free" as const;

    if (data.pro_until) {
      const now = new Date();
      const until = new Date(data.pro_until);
      if (until.getTime() < now.getTime()) return "free" as const;
    }

    return (data.plan === "pro" ? "pro" : "free") as const;
  } catch {
    return "free" as const;
  }
}

function safePart(v: unknown): "part1" | "part2" | "part3" | "unknown" {
  return v === "part1" || v === "part2" || v === "part3" ? v : "unknown";
}

// POST /api/speaking/attempts  (SAVE)
export async function POST(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase is not configured (missing env vars)" },
        { status: 500 }
      );
    }

    const body = await req.json();

    const {
      userId,
      part,
      duration_seconds,
      transcript,
      question_id,
      speaking_question_id,
      question_prompt,
      score_json,
      overall_band,
      model,
      isPro,
      audio_path,
      notes,
    } = body ?? {};

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const plan = await getUserPlan(userId);
    const wantsPro = !!isPro;

    // 🔐 strict guard: can't save a Pro attempt for a free user
    if (wantsPro && plan !== "pro") {
      return NextResponse.json(
        { error: "Cannot save Pro attempt for a Free user.", plan },
        { status: 403 }
      );
    }

    const safeTranscript = typeof transcript === "string" ? transcript.trim() : "";
    if (!safeTranscript) {
      return NextResponse.json({ error: "Missing transcript" }, { status: 400 });
    }

    const p = safePart(part);

    const derivedOverall =
      typeof overall_band === "number"
        ? overall_band
        : score_json && typeof score_json === "object" && typeof score_json.overall_band === "number"
        ? score_json.overall_band
        : null;

    const payload: any = {
      user_id: userId,
      part: p,
      duration_seconds: typeof duration_seconds === "number" ? duration_seconds : null,
      transcript: safeTranscript,

      // keep BOTH optional ids
      question_id: typeof question_id === "string" ? question_id : null,
      speaking_question_id:
        typeof speaking_question_id === "string" ? speaking_question_id : null,

      question_prompt: typeof question_prompt === "string" ? question_prompt : null,

      // scores
      overall_band: derivedOverall,            // your table currently stores as text; supabase will coerce if needed
      score_json: score_json ?? null,          // your table currently stores as text/json string; supabase will store whatever column type is
      model: typeof model === "string" ? model : null,

      // denormalized snapshot flags (truth remains in profiles)
      plan,
      is_pro: wantsPro && plan === "pro",

      audio_path: typeof audio_path === "string" ? audio_path : "inline-openai",
      notes: typeof notes === "string" ? notes : null,
    };

    const { data, error } = await supabase
      .from("speaking_attempts")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Supabase save error:", error);
      return NextResponse.json(
        { error: error.message ?? "Supabase error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, attempt: data });
  } catch (err: any) {
    console.error("Unexpected error in POST /api/speaking/attempts:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

// GET /api/speaking/attempts?userId=...
export async function GET(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase is not configured (missing env vars)" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ attempts: [] });
    }

    const { data, error } = await supabase
      .from("speaking_attempts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading speaking attempts:", error);
      return NextResponse.json(
        { error: "Failed to load speaking attempts" },
        { status: 500 }
      );
    }

    return NextResponse.json({ attempts: data ?? [] });
  } catch (err: any) {
    console.error("Unexpected error in GET /api/speaking/attempts:", err);
    return NextResponse.json(
      { error: "Unexpected error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
