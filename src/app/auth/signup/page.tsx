"use client";

import { useState } from "react";
import Link from "next/link";
import { useSupabaseSession } from "@/components/SupabaseSessionProvider";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const { supabase } = useSupabaseSession();
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

    // data.user is usually set here.
    // If email confirmations are ON, data.session will be null.
    if (!data.session) {
      setInfo(
        "Account created. Please check your email and click the confirmation link, then log in from the Login page."
      );
    } else {
      // Email confirmations OFF → user is already logged in
      window.location.href = "/";
    }
  };

  const handleGoogle = async () => {
    setError("");
    setInfo("");
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };

  return (
    <div className="max-w-sm mx-auto pt-10 space-y-6">
      <h1 className="text-xl font-semibold">Create an account</h1>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {info && <p className="text-emerald-700 text-sm">{info}</p>}

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

      <Button className="w-full" onClick={handleSignup} disabled={loading}>
        {loading ? "Creating account..." : "Sign up"}
      </Button>

      <Button variant="outline" className="w-full" onClick={handleGoogle}>
        Continue with Google
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
