// src/utils/supabase/server.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createClient() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. Check SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createSupabaseClient(url, key);
}
