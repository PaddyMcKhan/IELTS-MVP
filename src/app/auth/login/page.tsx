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
    } else {
      // On success, go to Practice (home) – this will also trigger the welcome popup logic
      window.location.href = "/";
    }
  };

  const handleGoogle = async () => {
    // This will only work once you enable Google in Supabase → Auth → Providers
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

  return (
    <div className="max-w-sm mx-auto pt-10 space-y-6">
      <h1 className="text-xl font-semibold">Sign in</h1>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <input
        type="email"
        placeholder="Email"
        className="w-full border p-2 rounded"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full border p-2 rounded"
        onChange={(e) => setPassword(e.target.value)}
      />

      <Button className="w-full" onClick={handleLogin} disabled={loading}>
        {loading ? "Loading..." : "Sign in"}
      </Button>

      <Button variant="outline" className="w-full" onClick={handleGoogle}>
        Continue with Google
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
