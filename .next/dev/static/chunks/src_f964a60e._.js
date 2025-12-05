(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/utils/supabase/client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// src/utils/supabase/client.ts
__turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/module/index.js [app-client] (ecmascript) <locals>");
;
let browserClient = null;
function createClient() {
    if (!browserClient) {
        const url = ("TURBOPACK compile-time value", "https://mbzbksvifkbcixbywbfk.supabase.co");
        const anonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1iemJrc3ZpZmtiY2l4Ynl3YmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NDIzOTQsImV4cCI6MjA3OTAxODM5NH0.SfMLocWK0OZUMJga1PcfDz_1CCZt34OZe2sDMjpgIQ8");
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        browserClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(url, anonKey);
    }
    return browserClient;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/SupabaseSessionProvider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SupabaseSessionProvider",
    ()=>SupabaseSessionProvider,
    "useSupabaseSession",
    ()=>useSupabaseSession
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/supabase/client.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
const SessionContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(null);
function SupabaseSessionProvider({ children }) {
    _s();
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const [session, setSession] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SupabaseSessionProvider.useEffect": ()=>{
            // Initial load
            supabase.auth.getSession().then({
                "SupabaseSessionProvider.useEffect": ({ data })=>{
                    setSession(data.session);
                }
            }["SupabaseSessionProvider.useEffect"]);
            // Listen for changes (login / logout)
            const { data: listener } = supabase.auth.onAuthStateChange({
                "SupabaseSessionProvider.useEffect": (_event, session)=>{
                    setSession(session);
                }
            }["SupabaseSessionProvider.useEffect"]);
            return ({
                "SupabaseSessionProvider.useEffect": ()=>{
                    listener.subscription.unsubscribe();
                }
            })["SupabaseSessionProvider.useEffect"];
        }
    }["SupabaseSessionProvider.useEffect"], [
        supabase
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SessionContext.Provider, {
        value: {
            session,
            supabase
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/SupabaseSessionProvider.tsx",
        lineNumber: 31,
        columnNumber: 5
    }, this);
}
_s(SupabaseSessionProvider, "my2JknXsLNPscnT9b+5uRmb6O9A=");
_c = SupabaseSessionProvider;
function useSupabaseSession() {
    _s1();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(SessionContext);
}
_s1(useSupabaseSession, "gDsCjeeItUuvgOWf1v4qoK9RF6k=");
var _c;
__turbopack_context__.k.register(_c, "SupabaseSessionProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_f964a60e._.js.map