"use client";

import { useEffect, useState } from "react";
import { useSupabaseSession } from "@/components/SupabaseSessionProvider";
import PageShell from "@/components/layout/PageShell";
import UpgradeToProButton from "./UpgradeToProButton";

type ProfileRow = {
  user_id: string;
  plan: string | null;
  invite_code: string | null;
  pro_expires_at?: string | null;
  referral_count?: number | null;
  created_at?: string;
  updated_at?: string;
};

export default function ProfilePage() {
  const { session, supabase } = useSupabaseSession();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string>("");

  const [redeemCode, setRedeemCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id || !supabase) return;

    async function loadProfile() {
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) {
          console.error("Profile load error:", error);
          setErrorMessage("Failed to load your profile.");
          return;
        }

        // ✅ If profile missing OR invite_code missing, ensure it exists via API
        if (!data || !data.invite_code) {
          const res = await fetch("/api/profile/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: session.user.id }),
          });

          const json = await res.json().catch(() => ({}));

          if (!res.ok || json?.error || !json?.profile) {
            console.error("Profile ensure error:", json?.error);
            setErrorMessage("Failed to initialize your profile.");
            return;
          }

          setProfile(json.profile as ProfileRow);
          return;
        }

        setProfile(data as ProfileRow);
      } catch (err) {
        console.error("Unexpected error:", err);
        setErrorMessage("Unexpected error while loading profile.");
      }
    }

    loadProfile();

  const planLabel = (profile?.plan ?? "FREE").toLowerCase();
  const inviteCode = profile?.invite_code ?? null;
  const proExpiresLabel = profile?.pro_expires_at
    ? new Date(profile.pro_expires_at).toLocaleDateString()
    : null;

  const handleCopyInvite = async () => {
  if (!inviteCode) return;
  try {
    await navigator.clipboard.writeText(inviteCode);
    setCopyStatus("Invite code copied!");
    setTimeout(() => setCopyStatus(""), 2000);
  } catch (err) {
    console.error("Clipboard error:", err);
    setCopyStatus("Could not copy");
    setTimeout(() => setCopyStatus(""), 2000);
  }
};

  const handleRedeemInvite = async () => {
    if (!session?.user?.id) return;
    if (!redeemCode.trim()) return;

    setRedeemLoading(true);
    setRedeemError(null);
    setRedeemSuccess(null);

    try {
      const res = await fetch("/api/profile/redeem-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: redeemCode.trim(),
          userId: session.user.id,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setRedeemError(json.error || "Failed to redeem invite code.");
        return;
      }

      setRedeemSuccess("Invite redeemed! Pro time added.");
      setRedeemCode("");

      // Refresh profile from Supabase so plan/expiry updates show
      // (simple approach: reload via same query)
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!error) setProfile(data as ProfileRow | null);
    } catch (err) {
      console.error("Redeem invite error:", err);
      setRedeemError("Failed to redeem invite code.");
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <PageShell
      title="Profile"
      description="Basic account overview. Plan & invite code are backed by Supabase."
    >
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-medium text-slate-200">
          Plan &amp; Invite
        </h2>

        {!session?.user && (
          <p className="mt-2 text-sm text-slate-400">
            You are not logged in.
          </p>
        )}

        {session?.user && (
          <>
            {errorMessage && (
              <p className="mt-2 text-sm text-red-500">{errorMessage}</p>
            )}

            {!errorMessage && (
              <>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <p>
                    <span className="text-slate-400">Current plan:</span>{" "}
                    <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                      {planLabel}
                    </span>
                  </p>

                  {proExpiresLabel && (
                    <p>
                      <span className="text-slate-400">
                        Pro access until:
                      </span>{" "}
                      {proExpiresLabel}
                    </p>
                  )}

                  <p>
                    <span className="text-slate-400">Invite code:</span>{" "}
                    {inviteCode ? (
                      <code className="rounded bg-slate-800 px-2 py-0.5 text-xs">
                        {inviteCode}
                      </code>
                    ) : (
                      <span className="text-slate-500">
                        No invite code yet. We&apos;ll generate one soon.
                      </span>
                    )}
                  </p>

                  {inviteCode && (
                    <button
                      type="button"
                      onClick={handleCopyInvite}
                      className="mt-1 text-xs underline text-emerald-400"
                    >
                      Copy invite link
                    </button>
                  )}

                  {copyStatus && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      {copyStatus}
                    </p>
                  )}

                  {!profile && !inviteCode && (
                    <p className="mt-3 text-xs text-slate-500">
                      Soon you&apos;ll be able to share this invite code to
                      unlock Pro scoring and extra features for friends — and
                      earn upgrades for yourself.
                    </p>
                  )}
                </div>

                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <div className="text-xs font-medium text-slate-200">Redeem invite code</div>
                  <p className="mt-1 text-xs text-slate-500">
                    Enter a friend’s code to unlock Pro time (7 days for you, 30 days for them).
                  </p>

                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={redeemCode}
                      onChange={(e) => setRedeemCode(e.target.value)}
                      placeholder="e.g. IELTS-D37B-B456"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 placeholder:text-slate-500"
                    />

                    <button
                      type="button"
                      onClick={handleRedeemInvite}
                      disabled={redeemLoading || !redeemCode.trim()}
                      className="rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {redeemLoading ? "Redeeming…" : "Redeem"}
                    </button>
                  </div>

                  {redeemError && (
                    <p className="mt-2 text-xs text-red-400">{redeemError}</p>
                  )}
                  {redeemSuccess && (
                    <p className="mt-2 text-xs text-emerald-300">{redeemSuccess}</p>
                  )}
                </div>

                <UpgradeToProButton disabled={planLabel === "pro"} />
              </>
            )}
          </>
        )}
      </section>
    </PageShell>
  );
}
