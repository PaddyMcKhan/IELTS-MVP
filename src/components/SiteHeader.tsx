"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSupabaseSession } from "@/components/SupabaseSessionProvider";

export function SiteHeader() {
  const { session, supabase } = useSupabaseSession();
  const email = session?.user?.email as string | undefined;
  const userId = session?.user?.id as string | undefined;

  const [isPro, setIsPro] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId || !supabase) {
      setIsPro(null);
      return;
    }

    let isMounted = true;

    async function fetchProfile() {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("is_pro")
        .eq("user_id", userId)
        .maybeSingle(); // 👈 key change

      if (!isMounted) return;

      if (error) {
        console.error("Error loading profile:", error);
        setIsPro(false);
        return;
      }

      // No row yet = not Pro (but not an error)
      if (!data) {
        setIsPro(false);
        return;
      }

      setIsPro(data.is_pro ?? false);
    }

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [userId, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        {/* Logo / brand */}
        <Link href="/" className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">
            IELTS MASTER
          </span>
        </Link>

        {/* Nav + Auth */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-4 text-sm text-slate-600">
            
            <Link href="/attempts" className="hover:text-slate-900">
              Attempts
            </Link>
            <Link href="/progress" className="hover:text-slate-900">
              Progress
            </Link>
            <Link href="/profile" className="hover:text-slate-900">
              Profile
            </Link>
            <Link href="/questions" className="hover:text-slate-900">
              Questions
            </Link>

            {/* NEW: short multi-app entry point */}
            <Link href="/apps" className="font-medium text-emerald-700 hover:text-emerald-800">
              Apps
            </Link>

            {/* existing Login/account area stays as-is */}
            {/* ... */}
          </nav>

          {/* Auth (Supabase) */}
          {session ? (
            <div className="flex items-center gap-3">
              {email && (
                <span className="hidden items-center gap-2 text-xs text-slate-500 sm:inline-flex">
                  <span>
                    Signed in as <span className="font-medium">{email}</span>
                  </span>
                  {isPro && (
                    <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      PRO
                    </span>
                  )}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="rounded-md border border-slate-300 px-3 py-1 text-xs sm:text-sm"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-md bg-slate-900 px-3 py-1 text-xs sm:text-sm text-white"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
