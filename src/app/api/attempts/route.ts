import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase setup
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

if (!supabaseUrl || !supabaseKey) {
  console.error("[/api/attempts] Missing Supabase env variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// POST /api/attempts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      questionId,
      questionText,
      module,
      task,
      essay,        // legacy text, if used
      essayText,    // main essay content
      wordCount,
      isPro,
      userId,       // should come from client when logged in
      scoreJson,    // full scoring JSON from AI examiner
      coherence,
      lexical,
      grammar,
      taskResponse,
      overallBand,  // optional, may or may not be passed
    } = body;

    // Try to extract overall band from scoreJson if not explicitly given
    let derivedOverall: number | null = null;
    if (typeof overallBand === "number") {
      derivedOverall = overallBand;
    } else if (
      scoreJson &&
      typeof scoreJson === "object" &&
      typeof scoreJson.overall === "number"
    ) {
      derivedOverall = scoreJson.overall;
    }

    const payload: any = {
      // numeric scores (nullable is fine)
      coherence: typeof coherence === "number" ? coherence : null,
      lexical: typeof lexical === "number" ? lexical : null,
      grammar: typeof grammar === "number" ? grammar : null,
      overall_band: derivedOverall,
      task_response:
        typeof taskResponse === "number" ? taskResponse : null,

      // metadata
      is_pro: !!isPro,
      module: module ?? null,
      task: task ?? null,
      question_id: questionId ?? null,
      question_text: questionText ?? null,
      user_id: userId ?? null,
      word_count:
        typeof wordCount === "number" ? wordCount : null,

      // essay content
      essay: essay ?? null,
      essay_text: essayText ?? essay ?? null,

      // ✅ IMPORTANT: store as real JSON object, not string
      score_json: scoreJson ?? null,
    };

    const { error } = await supabase
      .from("essay_attempts")
      .insert(payload);

    if (error) {
      console.error("Supabase save error:", error);
      return NextResponse.json(
        { ok: false, error: error.message ?? "Supabase error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Unexpected error in POST /api/attempts:", err);
    return NextResponse.json(
      { ok: false, error: "Unexpected error" },
      { status: 500 }
    );
  }
}

// GET /api/attempts?userId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    let query = supabase
      .from("essay_attempts")
      .select("*")
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading attempts:", error);
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
