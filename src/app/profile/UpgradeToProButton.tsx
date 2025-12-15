// src/app/profile/UpgradeToProButton.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UpgradeToProButton({ disabled }: { disabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    if (disabled || loading) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/profile/upgrade", {
        method: "POST",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || json.error) {
        setError(json.error || "Failed to upgrade to Pro.");
        return;
      }

      setSuccess(true);
      // Re-render the server-side /profile page with new plan value
      router.refresh();
    } catch (err) {
      console.error("Upgrade button error:", err);
      setError("Failed to upgrade to Pro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className="inline-flex items-center justify-center rounded-md border border-emerald-400 bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {disabled
          ? "You’re already on Pro"
          : loading
          ? "Upgrading…"
          : "Upgrade to Pro (test mode)"}
      </button>

      {error && (
        <p className="text-[11px] text-red-400">
          {error}
        </p>
      )}

      {success && !error && (
        <p className="text-[11px] text-emerald-300">
          Upgrade successful. This is a test-only upgrade; real payments will
          use invites or Stripe later.
        </p>
      )}
    </div>
  );
}
