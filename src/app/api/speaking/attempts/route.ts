//src/app/api/speaking/attempts/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/speaking/attempts
 * Query params:
 *   - userId (required)
 *   - id (optional, for single attempt)
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const rawId = searchParams.get("id");
    const id = rawId && rawId !== "undefined" && rawId !== "null" ? rawId : null;

    if (!userId) {
      return NextResponse.json({ attempts: [] });
    }

    let query = supabase
      .from("speaking_attempts")
      .select(
        "id, created_at, question_id, part, duration_seconds, overall_band, transcript, audio_path, score_json, model, question_prompt"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (id) {
      query = query.eq("id", id).limit(1);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/speaking/attempts] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to load speaking attempts" },
        { status: 500 }
      );
    }

    return NextResponse.json({ attempts: data ?? [] });
  } catch (err: any) {
    console.error("[GET /api/speaking/attempts] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/speaking/attempts
 * (Used by speaking scoring route if you already wired it this way)
 * This is intentionally minimal to avoid breaking existing behavior.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const { data, error } = await supabase
      .from("speaking_attempts")
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error("[POST /api/speaking/attempts] Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to save speaking attempt" },
        { status: 500 }
      );
    }

    return NextResponse.json({ attempt: data });
  } catch (err: any) {
    console.error("[POST /api/speaking/attempts] Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected server error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
