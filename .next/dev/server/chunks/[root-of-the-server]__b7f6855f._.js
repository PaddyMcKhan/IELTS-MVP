module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/utils/supabase/server.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// src/utils/supabase/server.ts
__turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/module/index.js [app-route] (ecmascript) <locals>");
;
function createClient() {
    const url = process.env.SUPABASE_URL ?? ("TURBOPACK compile-time value", "https://mbzbksvifkbcixbywbfk.supabase.co");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iemJrc3ZpZmtiY2l4Ynl3YmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NDIzOTQsImV4cCI6MjA3OTAxODM5NH0.SfMLocWK0OZUMJga1PcfDz_1CCZt34OZe2sDMjpgIQ8");
    if (!url || !key) {
        throw new Error("Missing Supabase environment variables. Check SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(url, key);
}
}),
"[project]/src/app/api/score/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/openai/client.mjs [app-route] (ecmascript) <export OpenAI as default>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/supabase/server.ts [app-route] (ecmascript)");
;
;
;
const client = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$openai$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__OpenAI__as__default$3e$__["default"]({
    apiKey: process.env.OPENAI_API_KEY
});
// Choose model depending on free vs pro mode
function pickModel(isPro) {
    // ENV override (owner-level)
    if (process.env.AI_PRO_MODE === "true") return "gpt-4o";
    // URL-level override
    if (isPro) return "gpt-4o";
    // Default (free tier)
    return "gpt-4o-mini";
}
async function POST(req) {
    try {
        const body = await req.json();
        const { essay, task, wordCount, question, questionId, taskType, minWords: clientMinWords } = body ?? {};
        // Basic validation
        if (!essay || !task || typeof wordCount !== "number") {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Missing required fields for scoring."
            }, {
                status: 400
            });
        }
        // Detect if this user is requesting pro mode (?pro=true)
        const { searchParams } = new URL(req.url);
        const isPro = searchParams.get("pro") === "true";
        const model = pickModel(isPro);
        // 🔑 Step 11E: fetch canonical task data from Supabase
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createClient"])();
        let dbTask = null;
        if (questionId) {
            const { data, error } = await supabase.from("writing_tasks").select("id, prompt, min_words, task_type").eq("id", questionId).single();
            if (!error && data) {
                dbTask = data;
            } else {
                console.warn("Score API: failed to load writing_tasks row", {
                    questionId,
                    error
                });
            }
        }
        // Canonical values (DB → client → defaults)
        const canonicalPrompt = dbTask?.prompt ?? question ?? "Unknown IELTS Writing task prompt (no prompt supplied).";
        const canonicalTaskType = dbTask?.task_type ?? taskType ?? (task === "task1" ? "task1_academic" : "task2_academic");
        const canonicalMinWords = typeof dbTask?.min_words === "number" ? dbTask.min_words : typeof clientMinWords === "number" ? clientMinWords : task === "task1" ? 150 : 250;
        const taskNumber = task === "task1" ? "1" : "2";
        const moduleLabel = canonicalTaskType.endsWith("_general") ? "General Training" : "Academic";
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
            max_output_tokens: 1024
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
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ...json,
            modelUsed: model
        });
    } catch (err) {
        console.error("Scoring error:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Failed to score essay",
            detail: err?.message,
            type: err?.type ?? "unknown"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__b7f6855f._.js.map