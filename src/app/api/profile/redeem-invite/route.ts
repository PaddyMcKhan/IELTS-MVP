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
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function computeNewExpiry(existing: string | null, days: number) {
  const now = new Date();
  const base = existing ? new Date(existing) : now;
  const start = base > now ? base : now;
  return addDays(start, days).toISOString();
}

export async function POST(req: Request) {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const inviteCode = String(body?.inviteCode ?? "").trim();
  const inviteeUserId = String(body?.userId ?? "").trim();

  if (!inviteCode) return NextResponse.json({ error: "Missing inviteCode" }, { status: 400 });
  if (!inviteeUserId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  // 1) Check prior redemption (fast path; DB also enforces)
  const { data: prior, error: priorErr } = await supabase
    .from("invite_redemptions")
    .select("id")
    .eq("invitee_user_id", inviteeUserId)
    .maybeSingle();

  if (priorErr) {
    console.error("redeem-invite: prior check error", priorErr);
    return NextResponse.json({ error: "Failed to validate eligibility" }, { status: 500 });
  }
  if (prior) {
    return NextResponse.json({ error: "Invite already redeemed" }, { status: 400 });
  }

  // 2) Find inviter by invite_code
  const { data: inviter, error: invErr } = await supabase
    .from("user_profiles")
    .select("user_id, invite_code, pro_expires_at, referral_count")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (invErr) {
    console.error("redeem-invite: inviter lookup error", invErr);
    return NextResponse.json({ error: "Failed to validate invite code" }, { status: 500 });
  }
  if (!inviter?.user_id) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
  }

  const inviterUserId = inviter.user_id as string;

  if (inviterUserId === inviteeUserId) {
    return NextResponse.json({ error: "You cannot use your own invite code" }, { status: 400 });
  }

  // 3) Load invitee profile (must exist if /profile already works; but handle just in case)
  const { data: invitee, error: inviteeErr } = await supabase
    .from("user_profiles")
    .select("user_id, pro_expires_at, invited_by_user_id")
    .eq("user_id", inviteeUserId)
    .maybeSingle();

  if (inviteeErr) {
    console.error("redeem-invite: invitee lookup error", inviteeErr);
    return NextResponse.json({ error: "Failed to load invitee profile" }, { status: 500 });
  }

  if (!invitee?.user_id) {
    return NextResponse.json({ error: "Invitee profile not found" }, { status: 400 });
  }

  // Optional extra guard: don't allow changing inviter once set
  if (invitee.invited_by_user_id) {
    return NextResponse.json({ error: "Invite already applied to this account" }, { status: 400 });
  }

  const inviteeNewExpiry = computeNewExpiry(invitee.pro_expires_at ?? null, 7);
  const inviterNewExpiry = computeNewExpiry(inviter.pro_expires_at ?? null, 30);

  // 4) Log redemption first (DB constraints prevent repeats/self)
  const { error: logErr } = await supabase.from("invite_redemptions").insert({
    inviter_user_id: inviterUserId,
    invitee_user_id: inviteeUserId,
    invite_code: inviteCode,
  });

  if (logErr) {
    return NextResponse.json({ error: "Invite already redeemed or invalid" }, { status: 400 });
  }

  // 5) Update invitee entitlement
  const { error: inviteeUpdateErr } = await supabase
    .from("user_profiles")
    .update({
      plan: "PRO",
      is_pro: true,
      pro_expires_at: inviteeNewExpiry,
      invited_by_user_id: inviterUserId,
    })
    .eq("user_id", inviteeUserId);

  if (inviteeUpdateErr) {
    console.error("redeem-invite: invitee update error", inviteeUpdateErr);
    return NextResponse.json({ error: "Failed to apply invite reward" }, { status: 500 });
  }

  // 6) Update inviter entitlement + referral count
  const newReferralCount = (inviter.referral_count ?? 0) + 1;

  const { error: inviterUpdateErr } = await supabase
    .from("user_profiles")
    .update({
      plan: "PRO",
      is_pro: true,
      pro_expires_at: inviterNewExpiry,
      referral_count: newReferralCount,
    })
    .eq("user_id", inviterUserId);

  if (inviterUpdateErr) {
    console.error("redeem-invite: inviter update error", inviterUpdateErr);
    return NextResponse.json({ error: "Failed to reward inviter" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    inviteeProExpiresAt: inviteeNewExpiry,
    inviterProExpiresAt: inviterNewExpiry,
    inviterReferralCount: newReferralCount,
  });
}
