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
"[project]/src/app/api/attempts/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/module/index.js [app-route] (ecmascript) <locals>");
;
;
// Supabase setup
const supabaseUrl = ("TURBOPACK compile-time value", "https://mbzbksvifkbcixbywbfk.supabase.co") ?? process.env.SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iemJrc3ZpZmtiY2l4Ynl3YmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NDIzOTQsImV4cCI6MjA3OTAxODM5NH0.SfMLocWK0OZUMJga1PcfDz_1CCZt34OZe2sDMjpgIQ8") ?? process.env.SUPABASE_ANON_KEY ?? "";
if (!supabaseUrl || !supabaseKey) {
    console.error("[/api/attempts] Missing Supabase env variables");
}
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseKey);
async function POST(req) {
    try {
        const body = await req.json();
        const { questionId, questionText, module, task, essay, essayText, wordCount, isPro, userId, scoreJson, coherence, lexical, grammar, taskResponse, overallBand } = body;
        // Try to extract overall band from scoreJson if not explicitly given
        let derivedOverall = null;
        if (typeof overallBand === "number") {
            derivedOverall = overallBand;
        } else if (scoreJson && typeof scoreJson === "object" && typeof scoreJson.overall === "number") {
            derivedOverall = scoreJson.overall;
        }
        const payload = {
            // numeric scores (nullable is fine)
            coherence: typeof coherence === "number" ? coherence : null,
            lexical: typeof lexical === "number" ? lexical : null,
            grammar: typeof grammar === "number" ? grammar : null,
            overall_band: derivedOverall,
            task_response: typeof taskResponse === "number" ? taskResponse : null,
            // metadata
            is_pro: !!isPro,
            module: module ?? null,
            task: task ?? null,
            question_id: questionId ?? null,
            question_text: questionText ?? null,
            user_id: userId ?? null,
            word_count: typeof wordCount === "number" ? wordCount : null,
            // essay content
            essay: essay ?? null,
            essay_text: essayText ?? essay ?? null,
            // ✅ IMPORTANT: store as real JSON object, not string
            score_json: scoreJson ?? null
        };
        const { error } = await supabase.from("essay_attempts").insert(payload);
        if (error) {
            console.error("Supabase save error:", error);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                ok: false,
                error: error.message ?? "Supabase error"
            }, {
                status: 500
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: true
        });
    } catch (err) {
        console.error("Unexpected error in POST /api/attempts:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            ok: false,
            error: "Unexpected error"
        }, {
            status: 500
        });
    }
}
async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");
        let query = supabase.from("essay_attempts").select("*").order("created_at", {
            ascending: false
        });
        if (userId) {
            query = query.eq("user_id", userId);
        }
        const { data, error } = await query;
        if (error) {
            console.error("Error loading attempts:", error);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Failed to load attempts"
            }, {
                status: 500
            });
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            attempts: data ?? []
        });
    } catch (err) {
        console.error("Unexpected error in GET /api/attempts:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Unexpected error"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__2c64b124._.js.map