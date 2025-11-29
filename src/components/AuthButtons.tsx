"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function AuthButtons() {
  const { data: session } = useSession();

  if (session) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-500 max-w-[140px] truncate text-right">
          Signed in as{" "}
          <span className="font-medium text-slate-700">
            {(session.user as any)?.name ??
              (session.user as any)?.email ??
              "candidate"}
          </span>
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut()}
        >
          Logout
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => signIn("github")}
    >
      Login with GitHub
    </Button>
  );
}
