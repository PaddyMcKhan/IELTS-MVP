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
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- Types ----------
type SpeakingBandScore = {
  overall_band: number;
  fluency_coherence: number;
  lexical_resource: number;
  grammatical_range_accuracy: number;
  pronunciation: number;
  estimated_words: number;
  estimated_duration_seconds: number;
  part: "part1" | "part2" | "part3" | "unknown";
  band_explanation_overall: string;
  strengths: string[];
  weaknesses: string[];
  improvement_tips: string[];

  long_feedback_overall?: string;
  long_feedback_fluency_coherence?: string;
  long_feedback_lexical_resource?: string;
  long_feedback_grammar_pronunciation?: string;
};

// ---------- Supabase setup ----------
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  "";
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

// ---------- User plan lookup (Pro vs Free) ----------
async function getUserPlan(userId: string | null | undefined) {
  if (!supabase || !userId) return "free" as const;

  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("plan, pro_until")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return "free" as const;

    if (data.pro_until) {
      const now = new Date();
      const until = new Date(data.pro_until);
      if (until.getTime() < now.getTime()) return "free" as const;
    }

    const planValue = (data.plan ?? "").toString().toLowerCase();
    return (planValue === "pro" ? "pro" : "free") as const;
  } catch {
    return "free" as const;
  }
}

// ---------- Model picker ----------
function pickModel(isPro: boolean) {
  if (process.env.AI_PRO_MODE === "true") return "gpt-4o"; // owner override
  if (isPro) return "gpt-4o";
  return "gpt-4o-mini";
}

// ---------- Route handler ----------
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;

// NEW: capture the prompt text so attempt details can show it later
    const questionPromptRaw = formData.get("questionPrompt");
    const questionPrompt =
      typeof questionPromptRaw === "string"
        ? questionPromptRaw
        : questionPromptRaw?.toString?.() ?? null;

    // Optional user id from client (if we send it later)
    const userIdRaw =
      (formData.get("user_id") as string | null) ??
      (formData.get("userId") as string | null) ??
      null;
    const userId = userIdRaw && userIdRaw.trim() !== "" ? userIdRaw.trim() : null;

    const notesRaw = formData.get("notes");
    const notes =
      typeof notesRaw === "string" && notesRaw.length > 0 ? notesRaw : null;

    const questionIdRaw =
      formData.get("questionId") ??
      formData.get("question_id") ??
      null;

    const partRaw = formData.get("part");
    const part: "part1" | "part2" | "part3" | "unknown" =
      partRaw === "part1" || partRaw === "part2" || partRaw === "part3"
        ? (partRaw as "part1" | "part2" | "part3")
        : "unknown";

    if (!audio) {
      return NextResponse.json(
        { error: "Missing audio file in `audio` field" },
        { status: 400 }
      );
    }

    console.log("Speaking: received File", {
      name: (audio as any).name,
      type: audio.type,
      size: audio.size,
    });

    // Convert the uploaded audio into a Buffer
    const arrayBuffer = await audio.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("Speaking: received audio bytes", buffer.length);

    if (!buffer.length) {
      return NextResponse.json(
        { error: "Uploaded audio file is empty" },
        { status: 400 }
      );
    }

    // Write the buffer to a temporary file and stream it to OpenAI.
    // This avoids any subtle issues with multipart encoding helpers.
    const tmpDir = os.tmpdir();
    const safeName =
      (audio as any).name && typeof (audio as any).name === "string"
        ? (audio as any).name
        : `speaking-${crypto.randomUUID()}.webm`;
    const tmpPath = path.join(tmpDir, safeName);

    await fs.promises.writeFile(tmpPath, buffer);

    let transcription;
    try {
      transcription = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: fs.createReadStream(tmpPath),
        language: "en",
        response_format: "json",
      });
    } finally {
      // Clean up the temp file; ignore errors
      fs.promises.unlink(tmpPath).catch(() => {});
    }

    const transcriptText = (transcription as any).text as string;

// --- NO SPEECH / GARBAGE AUDIO GUARD (CRITICAL) ---
const cleanedTranscript = (transcriptText ?? "").trim();
const words = cleanedTranscript.split(/\s+/).filter(Boolean);
const wordCount = words.length;

// Detect URLs / spammy hallucinations
const hasUrl = /https?:\/\/|www\.|\.com\b|\.co\b|\.net\b/i.test(cleanedTranscript);

if (wordCount < 3 || hasUrl) {
  // Save a "no speech detected" attempt, and return a minimum score
  if (userId && supabase) {
    await supabase.from("speaking_attempts").insert({
      user_id: userId,
      part: part ?? null,
      question_id: questionIdRaw ?? null,
      transcript: cleanedTranscript || null,
      notes: null,
      audio_path: "inline-openai",
      duration_seconds: null,
      estimated_duration_seconds: null,
      is_pro: false,
      model: "guard",
      plan: await getUserPlan(userId),
      overall_band: 1.0,
      score_json: { reason: "no_speech_detected", wordCount, hasUrl },
      question_prompt: questionPrompt,
    });
  }

  return NextResponse.json({
    transcript: cleanedTranscript,
    score: {
      overall_band: 1.0,
      fluency_coherence: 1.0,
      lexical_resource: 1.0,
      grammatical_range_accuracy: 1.0,
      pronunciation: 1.0,
      estimated_words: wordCount,
      estimated_duration_seconds: 0,
      part,
      band_explanation_overall:
        "No speech detected (silent or invalid audio). Please record again.",
      strengths: [],
      weaknesses: ["No audible speech detected."],
      improvement_tips: ["Record a clear spoken answer with audible volume."],
    },
    modelUsed: "guard",
    plan: await getUserPlan(userId),
    isProRequested: false,
  });
}
// --- END GUARD ---

    // ---------- Pro gating + model selection ----------
    const { searchParams } = new URL(req.url);
    const isProRequested = searchParams.get("pro") === "true";

    const plan = await getUserPlan(userId);

    if (isProRequested && plan !== "pro") {
      return NextResponse.json(
        {
          error:
            "Pro speaking scoring (GPT-4o) is only available for Pro users.",
          plan,
        },
        { status: 403 }
      );
    }

    const model = pickModel(isProRequested);

    // ---------- YOUR EXACT EXAMINER PROMPT ----------
    const scoringPrompt = `
You are a Senior IELTS Speaking Examiner with more than 15 years of formal examination experience. 
Your task is to evaluate a candidate’s spoken response using the OFFICIAL IELTS Speaking Band Descriptors.

Your assessment MUST reflect real-life examiner judgment: strict, specific, analytical, and professional.

=====================================================================
1. FLUENCY & COHERENCE (FC)
=====================================================================
Evaluate the candidate’s ability to:
- Speak at length without unnatural pauses or breakdowns.
- Produce extended, coherent ideas that logically progress.
- Use discourse markers naturally (not mechanically).
- Avoid hesitation fillers ("um", "uh", "you know") and self-correction.
- Maintain smooth pacing and rhythm appropriate for clear communication.

Identify any:
- Fragmented ideas
- Over-short answers
- Repetition of phrases/stems
- Hesitations that interrupt flow
- Signs of memorised templates

=====================================================================
2. LEXICAL RESOURCE (LR)
=====================================================================
Evaluate:
- Vocabulary range and precision for everyday and abstract topics.
- Ability to express subtle meaning, attitudes, and opinions.
- Natural paraphrasing instead of repeating the question.
- Collocational accuracy and appropriateness.
- Range of synonyms used naturally without distorting meaning.
- Avoidance of basic vocabulary and over-general language.

Identify:
- Misused words
- Incorrect collocations
- Missing register (too informal or too stiff)
- Repetitive vocabulary
- Attempts at advanced vocabulary that break meaning

=====================================================================
3. GRAMMATICAL RANGE & ACCURACY (GRA)
=====================================================================
Evaluate:
- Range of structures: complex sentences, subordinate clauses, conditionals, relative clauses.
- Accuracy: tenses, agreement, articles, prepositions, word order.
- Flexibility: ability to manipulate structures naturally during speech.
- Distribution of errors: occasional vs. frequent; local vs. global errors.

Identify:
- Frequent tense errors
- Limited structural range
- Systematic mistakes affecting clarity
- Overly simple SVO patterns

=====================================================================
4. PRONUNCIATION (PR)
=====================================================================
Evaluate:
- Clarity, intelligibility, and natural rhythm.
- Word stress, sentence stress, intonation patterns.
- Consonant and vowel accuracy.
- Ability to chunk speech naturally into meaningful units.
- How easily an examiner would understand them in a real interview.

Important:
Even though you are evaluating from a transcript, infer pronunciation band from:
- Word choice difficulty
- Error patterns
- Fluency issues linked to articulation
- Non-native phrasing indicating pronunciation challenges

=====================================================================
5. PART-SPECIFIC EXPECTATIONS
=====================================================================
Part 1:
- Short, natural, confident personal answers.

Part 2 (Long Turn):
- Ability to speak for 1–2 minutes continuously.
- Clear structure: introduction → details → elaboration → mini-conclusion.
- Ability to develop ideas without interviewer support.

Part 3:
- Analytical, extended, abstract responses.
- Ability to build arguments, compare ideas, evaluate consequences, and justify opinions.

=====================================================================
6. FEEDBACK QUALITY REQUIREMENTS
=====================================================================
Your feedback MUST:
- Be specific, not generic.
- Reference concrete strengths and weaknesses.
- Quote or paraphrase parts of the answer (no hallucination).
- Explain WHY each band score was awarded using descriptor language.
- Provide actionable, examiner-level improvement tips for reaching the next band.
- Avoid praise inflation; be academically honest and rigorous.

=====================================================================
7. SCORING RULES
=====================================================================
- All band scores MUST follow IELTS increments (5.0, 5.5, 6.0, 6.5, etc.).
- Be realistic and avoid score inflation.
- Clearly differentiate between borderline bands (e.g., 6.0 vs 6.5).

=====================================================================
8. ADVANCED LONG-FORM FEEDBACK FIELDS (FOR PRO USERS)
=====================================================================
In addition to short strengths/weaknesses/improvement_tips, you should also
populate the following long-form feedback fields for advanced learners:

- long_feedback_overall:
  1–3 paragraphs that synthesise performance across all criteria, written
  in a calm, authoritative examiner tone.

- long_feedback_fluency_coherence:
  1–2 paragraphs focusing ONLY on Fluency & Coherence, with concrete
  comments about pacing, hesitation, flow, and organisation of ideas.

- long_feedback_lexical_resource:
  1–2 paragraphs focusing ONLY on vocabulary range, precision, collocation
  control, and appropriacy.

- long_feedback_grammar_pronunciation:
  1–2 paragraphs combining detailed commentary on grammatical range/accuracy
  and pronunciation, referencing typical sentence patterns and likely
  intelligibility.

These long-form fields are designed for Pro users and must be detailed,
specific, and clearly linked to the awarded band scores.

=====================================================================
9. OUTPUT FORMAT
=====================================================================
You MUST return ONLY valid JSON matching the provided schema.
No markdown. No extra commentary. No explanations outside the JSON.
`;

    // ---------- Responses API with JSON schema ----------
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content: scoringPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Exam part: ${part || "unknown"}`,
                questionIdRaw
                  ? `Question ID (internal): ${questionIdRaw}`
                  : "Question ID (internal): unknown",
                "",
                "TRANSCRIPT BELOW:",
                transcriptText,
              ].join("\n"),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "ielts_speaking_score",
          schema: {
            type: "object",
            required: [
              "overall_band",
              "fluency_coherence",
              "lexical_resource",
              "grammatical_range_accuracy",
              "pronunciation",
              "estimated_words",
              "estimated_duration_seconds",
              "part",
              "band_explanation_overall",
              "strengths",
              "weaknesses",
              "improvement_tips",
              "long_feedback_overall",
              "long_feedback_fluency_coherence",
              "long_feedback_lexical_resource",
              "long_feedback_grammar_pronunciation",
            ],
            properties: {
              overall_band: { type: "number" },
              fluency_coherence: { type: "number" },
              lexical_resource: { type: "number" },
              grammatical_range_accuracy: { type: "number" },
              pronunciation: { type: "number" },
              estimated_words: { type: "integer" },
              estimated_duration_seconds: { type: "number" },
              part: {
                type: "string",
                enum: ["part1", "part2", "part3", "unknown"],
              },
              band_explanation_overall: { type: "string" },
              strengths: {
                type: "array",
                items: { type: "string" },
              },
              weaknesses: {
                type: "array",
                items: { type: "string" },
              },
              improvement_tips: {
                type: "array",
                items: { type: "string" },
              },
              long_feedback_overall: { type: "string" },
              long_feedback_fluency_coherence: { type: "string" },
              long_feedback_lexical_resource: { type: "string" },
              long_feedback_grammar_pronunciation: { type: "string" },
            },
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    // ---------- Extract structured score ----------
    const firstOutput = response.output?.[0];

    let extracted: unknown;

    if (
      firstOutput &&
      firstOutput.type === "message" &&
      Array.isArray(firstOutput.content) &&
      firstOutput.content[0]
    ) {
      const item = firstOutput.content[0] as any;

      // 1) Preferred: structured outputs attached as `parsed`
      if (item.parsed) {
        extracted = item.parsed;
      }
      // 2) Fallback: JSON in `text` (string or object)
      else if (item.text) {
        if (typeof item.text === "string") {
          try {
            extracted = JSON.parse(item.text);
          } catch (err) {
            console.error(
              "Speaking scoring: failed to JSON.parse text from Responses API",
              {
                textPreview: item.text.slice(0, 200),
                err,
              }
            );
          }
        } else {
          // If the SDK already gave us an object, just trust it
          extracted = item.text;
        }
      }
    }

    if (!extracted) {
      console.error(
        "Speaking scoring: no structured data in Responses API output",
        {
          rawOutput: response.output,
        }
      );
      throw new Error("Failed to parse speaking band score");
    }

    const score: SpeakingBandScore = extracted as SpeakingBandScore;

    // ---------- Save attempt directly into speaking_attempts ----------
    if (userId && supabase) {
      try {
        const payload = {
          user_id: userId,
          part: part ?? null,
          question_id: questionIdRaw ?? null,

          transcript: transcriptText ?? null,
          notes: null, // later we can pass 'notes' if you want to store them

          audio_path: "inline-openai",

          duration_seconds:
            typeof score.estimated_duration_seconds === "number"
              ? score.estimated_duration_seconds
              : null,

          estimated_duration_seconds:
            typeof score.estimated_duration_seconds === "number"
              ? score.estimated_duration_seconds
              : null,

          is_pro: !!isProRequested,
          model,
          plan,

          overall_band:
            typeof score.overall_band === "number"
              ? score.overall_band
              : null,

          score_json: score,
        };

        const { error } = await supabase
          .from("speaking_attempts")
          .insert(payload);

        if (error) {
          console.error("[speaking_attempts] insert error:", error);
        }
      } catch (saveErr) {
        console.error("Error saving speaking attempt:", saveErr);
      }
    }

    // ---------- Return to client ----------
    return NextResponse.json({
      transcript: transcriptText,
      score,
      modelUsed: model,
      plan,
      isProRequested,
    });
  } catch (err: any) {
    console.error("Speaking scoring error:", err);
    return NextResponse.json(
      {
        error: "Speaking scoring failed",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
