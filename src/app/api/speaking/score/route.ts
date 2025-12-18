// src/app/api/speaking/score/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

export const runtime = "nodejs";

// ---------- OpenAI client ----------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------- Supabase plan-check client (MATCHES latest writing /api/score) ----------
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "";

const supabase =
  supabaseUrl && supabaseKey
    ? createSupabaseClient(supabaseUrl, supabaseKey)
    : null;

async function getUserPlan(userId: string | null | undefined) {
  if (!supabase || !userId) {
    return "free" as const;
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("plan, pro_until")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      return "free" as const;
    }

    // Optional: if pro_until exists and is in the past, treat as free again
    if (data.pro_until) {
      const now = new Date();
      const until = new Date(data.pro_until);
      if (until.getTime() < now.getTime()) {
        return "free" as const;
      }
    }

    return (data.plan === "pro" ? "pro" : "free") as const;
  } catch {
    return "free" as const;
  }
}

// ---------- Model picker (same spirit as writing /api/score) ----------
function pickModel(isPro: boolean) {
  if (process.env.AI_PRO_MODE === "true") return "gpt-4o";
  if (isPro) return "gpt-4o";
  return "gpt-4o-mini";
}

function safePart(v: unknown): "part1" | "part2" | "part3" | "unknown" {
  return v === "part1" || v === "part2" || v === "part3" ? v : "unknown";
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isPro = searchParams.get("pro") === "true";

    const formData = await req.formData();

    const audio = formData.get("audio") as File | null;

    const userIdRaw =
      (formData.get("userId") as string | null) ??
      (formData.get("user_id") as string | null) ??
      null;

    const userId = userIdRaw && userIdRaw.trim() ? userIdRaw.trim() : null;

    const part = safePart(formData.get("part"));

    const durationSecondsRaw =
      formData.get("duration_seconds") ?? formData.get("durationSeconds");
    const duration_seconds =
      typeof durationSecondsRaw === "string" ? Number(durationSecondsRaw) : null;

    const questionPromptRaw = formData.get("questionPrompt");
    const question_prompt =
      typeof questionPromptRaw === "string"
        ? questionPromptRaw
        : questionPromptRaw?.toString?.() ?? null;

    if (!audio) {
      return NextResponse.json(
        { error: "Missing audio file in `audio` field" },
        { status: 400 }
      );
    }

    // 🔐 Pro gate (MATCHES writing /api/score)
    const plan = await getUserPlan(userId);
    if (isPro && plan !== "pro") {
      return NextResponse.json(
        {
          error: "Pro speaking scoring (GPT-4o) is only available for Pro users.",
          plan,
        },
        { status: 403 }
      );
    }

    const model = pickModel(isPro);

    // Buffer the upload
    const arrayBuffer = await audio.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer.length) {
      return NextResponse.json(
        { error: "Uploaded audio file is empty" },
        { status: 400 }
      );
    }

    // Temp file for Whisper
    const tmpDir = os.tmpdir();
    const safeName =
      typeof (audio as any).name === "string" && (audio as any).name.trim()
        ? (audio as any).name
        : `speaking-${crypto.randomUUID()}.webm`;

    const tmpPath = path.join(tmpDir, safeName);
    await fs.promises.writeFile(tmpPath, buffer);

    let transcript = "";
    try {
      const transcription = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: fs.createReadStream(tmpPath),
        language: "en",
        response_format: "json",
      });
      transcript = String((transcription as any).text ?? "");
    } finally {
      fs.promises.unlink(tmpPath).catch(() => {});
    }

    // --- NO SPEECH / GARBAGE GUARD ---
    const cleaned = transcript.trim();
    const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
    const hasUrl = /https?:\/\/|www\.|\.com\b|\.co\b|\.net\b/i.test(cleaned);

    const lower = cleaned.toLowerCase();

    // Detect mic-test / placeholder answers
    const micTestSignals = [
      "testing",
      "test test",
      "mic check",
      "microphone",
      "can you hear me",
      "one two",
      "1 2",
      "sound check",
      "check check",
      "hello hello",
      "just a test",
      "this is a test",
      "recording",
      "app test",
      "trying the app",
    ];

    // Repetition heuristic
    const words = lower.split(/\s+/).filter(Boolean);
    const uniqueRatio = words.length ? new Set(words).size / words.length : 0;
    const tooRepetitive = words.length >= 12 && uniqueRatio < 0.35;

    // “Too short to score” threshold
    const tooShort = wordCount < 12;

    // Mic-test is only a hard fail when it’s short-ish
    const isMicTest = micTestSignals.some((s) => lower.includes(s)) && wordCount < 70;

    if (tooShort || hasUrl || isMicTest || tooRepetitive) {
      return NextResponse.json(
        {
          ok: true,
          transcript: cleaned,
          score_json: null,
          reason: isMicTest
            ? "This sounds like a microphone/app test rather than an IELTS answer. Please answer the question naturally."
            : tooRepetitive
            ? "Your response was too repetitive to score reliably. Please try again with a fuller answer."
            : tooShort
            ? "Your response was too short to score reliably. Please try again with a longer answer."
            : "No valid speech detected.",
          plan,
          is_pro: isPro && plan === "pro",
          model,
        },
        { status: 200 }
      );
    }

    // Examiner prompt (free = short, pro = long)
    const system = `You are a Senior IELTS Speaking Examiner with 15+ years of professional experience.
Your job is to evaluate the candidate’s IELTS Speaking performance using the OFFICIAL public IELTS Speaking Band Descriptors.
You must assess with precision, discipline, and professional examiner judgement — no generous practice-room scoring.

Hard requirements:
- Return ONLY valid JSON (no markdown, no commentary, no extra keys).
- Scores must be realistic and defensible. Use 0.5 band increments only (e.g., 5.0, 5.5, 6.0).
- If the transcript is short, off-topic, or lacks development, penalise appropriately.
Repetition / development penalty:
- If the transcript repeats the same 1–2 ideas with little or no expansion, reduce Fluency & Coherence and Lexical Resource by at least 0.5 from what you would otherwise give.
- Very short answers (< 40 words) that do not provide reasons/examples should not exceed 4.0 overall, even if grammar is mostly correct.
- Do not invent facts about the candidate or the question. Judge only what is in the transcript.`;

    const user = `Context:
- This is IELTS Speaking ${part}.
- The candidate responded to a prompt/question (if provided) and produced a transcript.
- The goal is exam-day accuracy, not encouragement.

Task metadata:
- userId: ${userId ?? "unknown"}
- part: ${part}
- duration_seconds: ${Number.isFinite(duration_seconds as any) ? duration_seconds : "unknown"}
- question_prompt: ${question_prompt ?? "unknown"}

====================================================================
CANDIDATE TRANSCRIPT
====================================================================
${cleaned}

====================================================================
1) FLUENCY & COHERENCE (FC)
====================================================================
Evaluate:
- Ability to speak at length (as appropriate), with minimal undue hesitation.
- Logical sequencing of ideas; clarity of message.
- Use of discourse markers (linking) naturally (not mechanical).
- Ability to extend answers beyond short, undeveloped statements.
Identify:
- Long pauses, repeated self-corrections, broken flow.
- Weak progression, abrupt jumps, unclear referencing.
- Answers that are too short or fail to develop.

====================================================================
2) LEXICAL RESOURCE (LR)
====================================================================
Evaluate:
- Range and precision of vocabulary for the topic.
- Ability to paraphrase; use of collocations and idiomatic language (where natural).
- Appropriacy of word choice; ability to express nuance.
Identify:
- Repetition, vague/over-simple vocabulary.
- Misused words, awkward or unnatural phrases.
- Over-reaching with inaccurate “advanced” vocabulary.

====================================================================
3) GRAMMATICAL RANGE & ACCURACY (GRA)
====================================================================
Evaluate:
- Range of structures (simple + complex).
- Control of tense, agreement, articles, prepositions, word order.
- Error frequency and impact on clarity.
Identify:
- Systematic errors (recurring patterns).
- Over-reliance on simple sentence forms.
- Errors that impede understanding.

====================================================================
4) PRONUNCIATION (P)
====================================================================
Evaluate:
- Overall intelligibility.
- Word and sentence stress; rhythm and intonation.
- Individual sounds (as relevant) and connected speech features.
Identify:
- Frequent mispronunciations that cause strain for the listener.
- Flat/incorrect stress patterns that reduce intelligibility.
Note: You are judging from the transcript; be cautious and do not over-penalise for pronunciation unless the transcript strongly implies issues. Prefer conservative but realistic scoring.

====================================================================
5) FEEDBACK REQUIREMENTS (VERY IMPORTANT)
====================================================================
Your feedback MUST be specific to THIS transcript:
- Refer to concrete features you observed (e.g., repetition, lack of development, limited range, frequent errors).
- Explain WHY each band was awarded using band-descriptor language (paraphrased).
- Give practical steps to reach the next 0.5 band (e.g., 6.0 → 6.5) that match the weaknesses you found.
- Avoid generic advice.

====================================================================
6) PRO LONG-FORM FEEDBACK FIELDS (PRO USERS ONLY)
====================================================================
If PRO mode is enabled, also include:
- long_feedback_overall (1–3 short paragraphs)
- long_feedback_fluency_coherence (1–2 short paragraphs)
- long_feedback_lexical_resource (1–2 short paragraphs)
- long_feedback_grammar_pronunciation (1–2 short paragraphs; combine GRA + Pronunciation)

These must be detailed, concrete, and directly connected to the transcript and the band scores.

====================================================================
7) SCORING RULES
====================================================================
- Use 0.5 increments only.
- Be realistic — do NOT inflate scores.
- Distinguish borderline bands (e.g., 6.0 vs 6.5) with clear justification.
- If the answer is off-topic or fails to address the prompt, penalise coherence and development accordingly.
Strict Part 1 rule:
- The candidate must directly answer the question asked.
- If they fail to state whether they work or study OR fail to explain why they chose it, cap overall_band at 4.0 maximum, and consider 3.5 if language is repetitive or extremely limited.
- If they answer neither part, cap overall_band at 3.5 maximum.

====================================================================
8) OUTPUT FORMAT (CRITICAL)
====================================================================
Return ONLY valid JSON in EXACTLY this shape (no markdown, no extra keys):

{
  "overall_band": number,
  "fluency_coherence": number,
  "lexical_resource": number,
  "grammatical_range_accuracy": number,
  "pronunciation": number,
  "strengths": string[],
  "weaknesses": string[],
  "improvement_tips": string[]${
    isPro
      ? `,
  "long_feedback_overall": string,
  "long_feedback_fluency_coherence": string,
  "long_feedback_lexical_resource": string,
  "long_feedback_grammar_pronunciation": string`
      : ""
  }
}

If FREE mode, DO NOT include any long_feedback_* fields.
If PRO mode, you MUST include all long_feedback_* fields.`;

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    let score_json: any = null;

    try {
      score_json = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON", raw },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        transcript: cleaned,
        score_json,
        plan,
        is_pro: isPro && plan === "pro",
        model,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[POST /api/speaking/score] error:", err);
    return NextResponse.json(
      { error: "Unexpected server error", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
