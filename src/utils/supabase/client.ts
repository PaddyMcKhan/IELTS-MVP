// src/utils/supabase/client.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    }

    browserClient = createSupabaseClient(url, anonKey);
  }

  return browserClient;
}
