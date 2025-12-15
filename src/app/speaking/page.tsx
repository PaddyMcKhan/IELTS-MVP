// src/app/speaking/page.tsx
import Link from "next/link";
import { SpeakingRecorder } from "@/components/speaking/SpeakingRecorder";

export default function SpeakingHomePage() {
  return (
    <main className="min-h-dvh bg-white text-slate-900">
      <div className="mx-auto max-w-3xl flex flex-col gap-8 p-6">
        {/* Hero */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Speaking beta
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            IELTS Speaking Practice Lab
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            This lab will mirror your Writing experience: realistic exam timing,
            structured parts (1–3), saved attempts, and AI-style feedback on
            fluency, grammar, vocabulary and pronunciation. Today we&apos;ll
            start with a simple, timed Part 1 practice flow.
          </p>
        </section>

        {/* Entry card */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Quick Part 1 session
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Short, everyday questions with a countdown — ideal for warm-up and
              daily speaking consistency.
            </p>
            <Link
              href="/speaking/practice"
              className="mt-4 inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black"
            >
              Start Speaking practice →
            </Link>
          </div>

          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">
              Coming later in this lab:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Full Speaking mock tests (Parts 1–3).</li>
              <li>Audio recording and storage via Supabase.</li>
              <li>
                AI feedback on fluency, grammar, vocabulary and pronunciation.
              </li>
              <li>Speaking progress dashboard, linked to your main profile.</li>
            </ul>
          </div>
        </section>

        {/* Back link */}
        <section className="text-[11px] text-slate-500">
          Need to write an essay instead?{" "}
          <Link
            href="/"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline"
          >
            Go to the Writing Lab
          </Link>
          
        </section>
      </div>
    </main>
  );
}
