// src/app/api/profile/upgrade/route.ts

import { NextResponse } from "next/server";
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

export async function POST(req: Request) {
  // ✅ Hard lock: prevent public abuse
  const secret = req.headers.get("x-admin-secret");
  if (
    !process.env.ADMIN_UPGRADE_SECRET ||
    secret !== process.env.ADMIN_UPGRADE_SECRET
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  try {
    // For MVP: upgrade the most recently created profile row
    const { data: latest, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Upgrade: error loading latest profile:", fetchError);
      return NextResponse.json(
        { error: "Failed to load profile for upgrade." },
        { status: 500 }
      );
    }

    if (!latest) {
      return NextResponse.json(
        { error: "No profile found to upgrade." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update({
        plan: "pro",
        pro_since: nowIso,
        pro_until: null,
        upgrade_reason: "manual",
      })
      .eq("user_id", latest.user_id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Upgrade: error updating profile:", updateError);
      return NextResponse.json(
        { error: "Failed to upgrade profile." },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: updated });
  } catch (err) {
    console.error("Upgrade: unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error while upgrading profile." },
      { status: 500 }
    );
  }
}
