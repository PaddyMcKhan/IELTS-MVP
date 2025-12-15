import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

function generateInviteCode(userId: string) {
  const clean = userId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const partA = clean.slice(0, 4) || "USER";
  const partB = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `IELTS-${partA}-${partB}`;
}

export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);

  if (!body?.userId) {
    return NextResponse.json(
      { error: "Missing userId" },
      { status: 400 }
    );
  }

  const userId = String(body.userId);

  // 1) Try to load existing profile
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error reading profile:", error);
    return NextResponse.json(
      { error: "Failed to read profile" },
      { status: 500 }
    );
  }

  if (data) {
    // Already exists — return it
    return NextResponse.json({ profile: data });
  }

  // 2) Create a default profile
  const inviteCode = generateInviteCode(userId);

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      plan: "free",
      invite_code: inviteCode,
    })
    .select("*")
    .single();

  if (insertError) {
    console.error("Error creating profile:", insertError);
    return NextResponse.json(
      { error: "Failed to create profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile: inserted });
}
