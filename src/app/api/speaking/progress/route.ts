import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("speaking_attempts")
      .select("overall_band, score_json")
      .eq("user_id", userId);

    if (error) throw error;

    const attempts = data ?? [];

    let count = 0;
    let overallSum = 0;

    let flu = 0;
    let lex = 0;
    let gra = 0;
    let pro = 0;

    const weaknessMap: Record<string, number> = {};

    for (const a of attempts) {
      const score = a.score_json?.score ?? a.score_json ?? {};

      if (typeof a.overall_band === "number") {
        overallSum += a.overall_band;
        count++;
      }

      if (typeof score.fluency_coherence === "number") flu += score.fluency_coherence;
      if (typeof score.lexical_resource === "number") lex += score.lexical_resource;
      if (typeof score.grammatical_range_accuracy === "number") gra += score.grammatical_range_accuracy;
      if (typeof score.pronunciation === "number") pro += score.pronunciation;

      if (Array.isArray(score.weaknesses)) {
        for (const w of score.weaknesses) {
          weaknessMap[w] = (weaknessMap[w] ?? 0) + 1;
        }
      }
    }

    const avg = (n: number) => (count ? Number((n / count).toFixed(2)) : null);

    const topWeaknesses = Object.entries(weaknessMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, freq]) => ({ label, freq }));

    return NextResponse.json({
      attempts: attempts.length,
      averages: {
        overall: avg(overallSum),
        fluency: avg(flu),
        lexical: avg(lex),
        grammar: avg(gra),
        pronunciation: avg(pro),
      },
      topWeaknesses,
    });
  } catch (err: any) {
    console.error("Speaking progress error:", err);
    return NextResponse.json({ error: "Failed to compute speaking progress" }, { status: 500 });
  }
}
