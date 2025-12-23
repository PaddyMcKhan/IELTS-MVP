"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSupabaseSession } from "@/components/SupabaseSessionProvider";
import { Button } from "@/components/ui/button";

export default function SignupClient() {
  const { supabase } = useSupabaseSession();
  const searchParams = useSearchParams();
  const invite = searchParams?.get("invite") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError("");
    setInfo("");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (invite) {
      try {
        await supabase.rpc("redeem_invite_code", { invite_code: invite });
      } catch (e) {
        console.error("Invite redeem error:", e);
      }
    }

    if (!data.session) {
      setInfo(
        "Account created. Please check your email and click the confirmation link, then log in from the Login page."
      );
    } else {
      // Email confirmations OFF → user is already logged in
      window.location.href = "/apps";
    }
  };

  return (
    <div className="max-w-sm mx-auto pt-10 space-y-6">
      <h1 className="text-xl font-semibold">Create an account</h1>

      {invite && (
        <p className="text-xs text-emerald-600">
          Signing up with invite code{" "}
          <code className="px-1 py-0.5 rounded bg-emerald-50">{invite}</code>. You&apos;ll get 7 days of
          Pro, and your friend earns 30 days.
        </p>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {info && <p className="text-emerald-700 text-sm">{info}</p>}

      <input
        type="email"
        placeholder="Email"
        className="w-full border p-2 rounded"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full border p-2 rounded"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />

      <Button className="w-full" onClick={handleSignup} disabled={loading}>
        {loading ? "Creating account..." : "Sign up"}
      </Button>

      <p className="text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/auth/login" className="underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
