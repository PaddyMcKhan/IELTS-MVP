// src/app/api/score/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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
      userId,
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

    // 🔐 NEW: check the user's subscription plan
    const plan = await getUserPlan(userId);

    if (isPro && plan !== "pro") {
      return NextResponse.json(
        {
          error: "Pro scoring (GPT-4o) is only available for Pro users.",
          plan,
        },
        { status: 403 }
      );
    }

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
You are a Senior IELTS Writing Examiner with more than 15 years of professional experience.
Your job is to evaluate the candidate’s Writing Task ${taskNumber} (${moduleLabel}) essay using the
OFFICIAL IELTS Writing Band Descriptors. You must assess the essay with precision, discipline, and
professional examiner judgement.

Context:
- This is IELTS Writing Task ${taskNumber} (${moduleLabel}).
- Use the official public band descriptors for Task ${taskNumber}.
- Your scoring must reflect realistic exam-day performance, not generous practice-room scoring.

Task metadata:
- taskId: ${questionId ?? "unknown"}
- taskType: ${canonicalTaskType}
- module: ${moduleLabel}
- minWords: ${canonicalMinWords}

====================================================================
1. TASK RESPONSE (TR)
====================================================================
Evaluate the essay’s ability to:
- Fully address ALL parts of the question.
- Present a clear, relevant position throughout (especially for Task 2).
- Provide well-developed ideas, extended explanations, and concrete, specific examples.
- Avoid memorised templates, off-topic ideas, or generic padding.
- Maintain academic register and relevance.
- Demonstrate insight, nuance, and logical reasoning.

Identify:
- Missing components of the question.
- Over-generalised or vague points.
- Under-developed ideas or examples.
- Unclear or shifting positions.
- Unsupported claims or logical gaps.
- Any signs of template-heavy or memorised answers.

====================================================================
2. COHERENCE AND COHESION (CC)
====================================================================
Evaluate:
- Overall organisation of information across the whole essay.
- Clear topic sentences and paragraph unity.
- Logical progression of ideas (macro-coherence).
- Sentence-to-sentence flow (micro-coherence).
- Effective use of cohesive devices without overuse or mechanical linking.
- Clear referencing, substitution, and logical sequencing.
- Appropriate paragraphing and paragraph breaks.

Identify:
- Where the flow breaks or feels jumpy.
- Abrupt transitions or poorly linked ideas.
- Overuse or repetition of the same linking words.
- Paragraphs that lack a clear central idea.
- Poor sequencing or sudden changes of direction.

====================================================================
3. LEXICAL RESOURCE (LR)
====================================================================
Evaluate:
- Precision, appropriacy, and sophistication of vocabulary.
- Ability to express subtle shades of meaning and attitude.
- Academic/formal tone appropriate for IELTS.
- Collocational accuracy and naturalness.
- Range of synonyms used naturally without distorting meaning.
- Ability to paraphrase the question accurately and flexibly.

Identify:
- Misused words or awkward expressions.
- Incorrect or unnatural collocations.
- Overly informal or conversational language where an academic register is needed.
- Repetitive vocabulary and missed opportunities to use more precise terms.
- Attempts at advanced vocabulary that are inaccurate or distort meaning.

====================================================================
4. GRAMMATICAL RANGE AND ACCURACY (GRA)
====================================================================
Evaluate:
- Range of complex sentence structures (subordinate clauses, conditionals,
  relative clauses, concessive clauses, etc.).
- Accurate control of tense, subject–verb agreement, articles, prepositions,
  word order, and punctuation.
- Grammar errors that seriously affect clarity of meaning.
- Frequency and distribution of errors (occasional vs systematic).
- Variety and flexibility of sentence structures.

Identify:
- Recurring grammatical weaknesses (e.g. articles, verb forms, prepositions).
- Overly simple sentence patterns with little subordination.
- Run-on sentences, fragments, and punctuation problems.
- Errors in more complex constructions.
- Lack of syntactic flexibility or over-reliance on one safe pattern.

====================================================================
5. FEEDBACK REQUIREMENTS (VERY IMPORTANT)
====================================================================
Your job is NOT to give generic advice. Your feedback MUST:
- Be highly specific to this candidate’s essay.
- Refer to concrete strengths and weaknesses.
- Paraphrase or briefly quote typical errors or weak phrases (without copying
  large chunks of the essay verbatim).
- Explain WHY the essay achieved this band, using language from the band descriptors.
- Provide practical, examiner-level steps to reach the next band (e.g. from 6.0 to 6.5).

====================================================================
6. ADVANCED LONG-FORM FEEDBACK FIELDS (FOR PRO USERS)
====================================================================
In addition to short comments, you MUST also prepare deeper, paragraph-style feedback
fields suitable for serious learners and Pro subscribers:

- comments.long_overall:
  1–3 paragraphs that synthesise performance across ALL criteria in an authoritative
  examiner tone.

- comments.long_taskResponse:
  1–2 paragraphs focusing ONLY on Task Response: addressing all parts, quality of ideas,
  depth of explanation, and relevance.

- comments.long_coherence:
  1–2 paragraphs focusing ONLY on Coherence & Cohesion: paragraphing, logical flow, and
  quality of linking.

- comments.long_lexical:
  1–2 paragraphs focusing ONLY on Lexical Resource: range, precision, register, and
  collocation.

- comments.long_grammar:
  1–2 paragraphs focusing ONLY on Grammatical Range & Accuracy: sentence variety and error
  patterns.

These long_* fields are for advanced learners and MUST be detailed, concrete, and directly
connected to the band scores.

====================================================================
7. SCORING RULES
====================================================================
- All band scores must follow IELTS increments (e.g. 5.0, 5.5, 6.0, 6.5, 7.0).
- Be realistic — do NOT inflate scores.
- Distinguish clearly between borderline bands (e.g. 6.0 vs 6.5) and justify in comments.
- Penalise underlength essays appropriately when they significantly reduce development.

====================================================================
8. OUTPUT FORMAT (CRITICAL)
====================================================================
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
    "advice": string,

    "long_overall": string,
    "long_taskResponse": string,
    "long_coherence": string,
    "long_lexical": string,
    "long_grammar": string
  }
}

Where:
- Each score is an IELTS band (e.g. 5, 5.5, 6, 6.5, 7).
- "overview" summarises the overall performance in 3–5 sentences.
- "taskResponse" gives specific feedback on addressing the question and idea development.
- "coherence" gives feedback on organisation, paragraphing, and linking.
- "lexical" gives feedback on vocabulary range, precision, and appropriacy.
- "grammar" gives feedback on grammatical range and accuracy.
- "advice" gives 3–6 concise, practical tips to improve.
- The long_* fields provide deeper paragraph-style feedback aligned to each criterion,
  suitable for advanced/Pro users.

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
