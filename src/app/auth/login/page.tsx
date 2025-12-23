"use client";

import { useState } from "react";
import Link from "next/link";
import { useSupabaseSession } from "@/components/SupabaseSessionProvider";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { supabase } = useSupabaseSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // after sign-in, send users to the IELTS-Master Hub
  const NEXT_AFTER_LOGIN = "/apps";

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    window.location.href = NEXT_AFTER_LOGIN;
  };

  return (
    <div className="max-w-sm mx-auto pt-10 space-y-6">
      <h1 className="text-xl font-semibold">Sign in</h1>

      {error && <p className="text-red-600 text-sm">{error}</p>}

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
        autoComplete="current-password"
      />

      <Button className="w-full" onClick={handleLogin} disabled={loading}>
        {loading ? "Loading..." : "Sign in"}
      </Button>

      <p className="text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" className="underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
