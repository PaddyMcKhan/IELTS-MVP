"use client";

import Link from "next/link";
import { useSupabaseSession } from "@/components/SupabaseSessionProvider";

export function SiteHeader() {
  const { session, supabase } = useSupabaseSession();
  const email = session?.user?.email as string | undefined;

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
            IELTS Writing Practice
          </span>
        </Link>

        {/* Nav + Auth */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-3 text-xs sm:text-sm">
            <Link
              href="/"
              className="text-slate-600 hover:text-slate-900"
            >
              Practice
            </Link>
            <Link
              href="/attempts"
              className="text-slate-600 hover:text-slate-900"
            >
              My attempts
            </Link>
            <Link
              href="/progress"
              className="text-slate-600 hover:text-slate-900"
            >
              Progress
            </Link>
            <Link
              href="/profile"
              className="text-slate-600 hover:text-slate-900"
            >
              Profile
            </Link>
          </nav>

          {/* Auth (Supabase) */}
          {session ? (
            <div className="flex items-center gap-3">
              {email && (
                <span className="hidden text-xs text-slate-500 sm:inline">
                  Signed in as <span className="font-medium">{email}</span>
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
