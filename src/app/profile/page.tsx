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
        } else {
          setProfile(data as ProfileRow | null);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setErrorMessage("Unexpected error while loading profile.");
      }
    }

    loadProfile();
  }, [session, supabase]);

  const planLabel = profile?.plan ?? "free";
  const inviteCode = profile?.invite_code ?? null;
  const proExpiresLabel = profile?.pro_expires_at
    ? new Date(profile.pro_expires_at).toLocaleDateString()
    : null;

  const handleCopyInvite = async () => {
    if (!inviteCode) return;
    try {
      const url = `${window.location.origin}/auth/signup?invite=${inviteCode}`;
      await navigator.clipboard.writeText(url);
      setCopyStatus("Copied!");
      setTimeout(() => setCopyStatus(""), 2000);
    } catch (err) {
      console.error("Clipboard error:", err);
      setCopyStatus("Could not copy");
      setTimeout(() => setCopyStatus(""), 2000);
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

                <UpgradeToProButton disabled={planLabel === "pro"} />
              </>
            )}
          </>
        )}
      </section>
    </PageShell>
  );
}
