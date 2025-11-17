import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Choose model depending on free vs pro mode
function pickModel(isPro: boolean) {
  // ENV override (owner-level)
  if (process.env.AI_PRO_MODE === "true") return "gpt-4o";

  // URL-level override
  if (isPro) return "gpt-4o";

  // Default (free tier)
  return "gpt-4o-mini";
}

export async function POST(req: Request) {
  try {
    const { essay, task, wordCount, question } = await req.json();

    // Detect if this user is requesting pro mode
    const { searchParams } = new URL(req.url);
    const isPro = searchParams.get("pro") === "true";

    const model = pickModel(isPro);

    const minWords = task === "task1" ? 150 : 250;

    const prompt = `
You are an official IELTS Writing Examiner.

Evaluate the following Task ${task === "task1" ? "1" : "2"} essay using the 
IELTS Academic Writing band descriptors.

You MUST return ONLY valid JSON in this exact shape, with no markdown and no comments:

{
  "taskResponse": number,
  "coherence": number,
  "lexical": number,
  "grammar": number,
  "overall": number,
  "comments": {
    "overview": string,
    "taskResponse": string,
    "coherence": string,
    "lexical": string,
    "grammar": string,
    "advice": string
  }
}

Round all band scores to the nearest 0.5.

# Essay Question:
${question}

# Candidate Essay:
${essay}

# Word Count: ${wordCount}
# Min Required: ${minWords}
    `.trim();

    const completion = await client.responses.create({
      model,
      input: prompt,
      max_output_tokens: 1024,
    });

    // Get raw text and strip any accidental ```json fences
    let raw = completion.output_text.trim();

    if (raw.startsWith("```")) {
      const firstNewline = raw.indexOf("\n");
      const lastFence = raw.lastIndexOf("```");
      if (firstNewline !== -1) {
        raw = raw.slice(firstNewline + 1, lastFence === -1 ? undefined : lastFence).trim();
      }
    }

    const json = JSON.parse(raw);

    return NextResponse.json({
      ...json,
      modelUsed: model,
    });
  } catch (err: any) {
    console.error("Scoring error:", err);
    return NextResponse.json(
      {
        error: "Failed to score essay",
        detail: err?.message,
        type: err?.type ?? "unknown",
      },
      { status: 500 }
    );
  }
}
