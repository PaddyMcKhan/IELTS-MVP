import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Match the Supabase Next.js quickstart env naming.
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
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// ✅ POST: save a single attempt
export async function POST(req: Request) {
  try {
    if (!supabase) {
      console.error("Supabase client is not configured");
      return NextResponse.json(
        { error: "Supabase client is not configured" },
        { status: 500 }
      );
    }

    const { questionId, essayText, score, userId } = await req.json();

    if (!questionId || !essayText) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { error } = await supabase.from("essay_attempts").insert({
      user_id: userId ?? null,       // currently this will be null until we trust a real userId
      question_id: questionId,
      essay_text: essayText,
      score_json: score,
    });

    if (error) {
      console.error("Supabase save error:", error);
      return NextResponse.json(
        { error: "Failed to save essay attempt" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in POST /api/attempts:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}

// ✅ GET: fetch recent attempts (optionally filtered by userId)
export async function GET(req: Request) {
  try {
    if (!supabase) {
      console.error("Supabase client is not configured");
      return NextResponse.json(
        { error: "Supabase client is not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    let query = supabase
      .from("essay_attempts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase fetch error:", error);
      return NextResponse.json(
        { error: "Failed to load attempts" },
        { status: 500 }
      );
    }

    return NextResponse.json({ attempts: data ?? [] });
  } catch (err) {
    console.error("Unexpected error in GET /api/attempts:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
