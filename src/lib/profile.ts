import { createClient } from "@/utils/supabase/server";

export async function getUserProfile(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("is_pro")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Profile fetch error:", error);
    return { is_pro: false };
  }

  return data;
}
