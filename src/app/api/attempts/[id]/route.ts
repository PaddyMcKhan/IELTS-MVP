import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const supabase = createClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("essay_attempts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ attempt: data });
}
