import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/utils/supabase/server";

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
    const body = await req.json();

    const {
      essay,
      task,                // "task1" | "task2" from UI
      wordCount,
      question,            // client copy of prompt (fallback only)
      questionId,          // writing_tasks.id
      taskType,            // e.g. "task2_academic" (fallback only)
      minWords: clientMinWords, // min words from client (fallback only)
    } = body ?? {};

    // Basic validation
    if (!essay || !task || typeof wordCount !== "number") {
      return NextResponse.json(
        { error: "Missing required fields for scoring." },
        { status: 400 }
      );
    }

    // Detect if this user is requesting pro mode (?pro=true)
    const { searchParams } = new URL(req.url);
    const isPro = searchParams.get("pro") === "true";

    const model = pickModel(isPro);

    // 🔑 Step 11E: fetch canonical task data from Supabase
    const supabase = createClient();

    let dbTask: any = null;

    if (questionId) {
      const { data, error } = await supabase
        .from("writing_tasks")
        .select("id, prompt, min_words, task_type")
        .eq("id", questionId)
        .single();

      if (!error && data) {
        dbTask = data;
      } else {
        console.warn("Score API: failed to load writing_tasks row", {
          questionId,
          error,
        });
      }
    }

    // Canonical values (DB → client → defaults)
    const canonicalPrompt: string =
      dbTask?.prompt ??
      question ??
      "Unknown IELTS Writing task prompt (no prompt supplied).";

    const canonicalTaskType: string =
      dbTask?.task_type ??
      taskType ??
      (task === "task1" ? "task1_academic" : "task2_academic");

    const canonicalMinWords: number =
      typeof dbTask?.min_words === "number"
        ? dbTask.min_words
        : typeof clientMinWords === "number"
        ? clientMinWords
        : task === "task1"
        ? 150
        : 250;

    const taskNumber = task === "task1" ? "1" : "2";
    const moduleLabel = canonicalTaskType.endsWith("_general")
      ? "General Training"
      : "Academic";

    const prompt = `
You are an official IELTS Writing Examiner.

Evaluate the following Writing Task ${taskNumber} (${moduleLabel}) essay
using the official IELTS Writing band descriptors for Task ${taskNumber}.

Task metadata:
- taskId: ${questionId ?? "unknown"}
- taskType: ${canonicalTaskType}
- module: ${moduleLabel}
- minWords: ${canonicalMinWords}

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
${canonicalPrompt}

# Candidate Essay:
${essay}

# Word Count: ${wordCount}
# Min Required: ${canonicalMinWords}
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
        raw = raw
          .slice(firstNewline + 1, lastFence === -1 ? undefined : lastFence)
          .trim();
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
