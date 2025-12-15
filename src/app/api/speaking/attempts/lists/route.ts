import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "";

const supabase =
  supabaseUrl && supabaseKey
    ? createSupabaseClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      })
    : null;

export async function GET(req: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 },
      );
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("speaking_attempts")
      .select(
        "id,user_id,part,question_id,duration_seconds,transcript,notes,created_at,model,plan,is_pro,overall_band,estimated_duration_seconds",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("speaking attempts list error:", error);
      return NextResponse.json({ error: "Failed to load attempts" }, { status: 500 });
    }

    return NextResponse.json({ attempts: data ?? [] });
  } catch (err: any) {
    console.error("speaking attempts list exception:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
