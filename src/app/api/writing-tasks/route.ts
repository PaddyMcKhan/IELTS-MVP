import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// We only need read access here, so anon key is fine.
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskType = searchParams.get("task_type"); // e.g. task2_academic

    let query = supabase
      .from("writing_tasks")
      .select(
        "id, task_type, title, prompt, diagram_alt, diagram_image_url, min_words, is_active, created_at"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (taskType) {
      query = query.eq("task_type", taskType);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching writing_tasks:", error);
      return NextResponse.json(
        { error: "Failed to fetch writing tasks" },
        { status: 500 }
      );
    }

    return NextResponse.json({ tasks: data ?? [] }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error in /api/writing-tasks:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
