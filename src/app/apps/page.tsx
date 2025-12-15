 // src/app/apps/page.tsx
import Link from "next/link";

export default function AppsHubPage() {
  return (
    <main className="min-h-dvh bg-white text-slate-900">
      <div className="mx-auto max-w-3xl flex flex-col gap-8 p-6">
        {/* Hero */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            IELTS-Master Hub
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            IELTS-Master.AI — all your practice labs in one place
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Choose a practice lab to enter. All apps share the same login,
            profile, Pro plan and progress data — this is your central home for
            IELTS preparation.
          </p>
        </section>

        {/* App cards */}
        <section className="grid gap-4 md:grid-cols-2">
          {/* Writing Lab */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-1.5">
              <h2 className="text-sm font-semibold text-slate-900">
                Writing Lab
              </h2>
              <p className="text-xs text-slate-600">
                Practice Task 1 &amp; Task 2 with strict timing, AI scoring, and
                full attempt history. This is the app you&apos;ve already built.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-[11px] uppercase tracking-wide text-emerald-600">
                Live
              </span>
              <Link
                href="/"
                className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
              >
                Enter Writing Lab
              </Link>
            </div>
          </div>

          {/* Speaking Lab */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-1.5">
              <h2 className="text-sm font-semibold text-slate-900">
                Speaking Lab{" "}
                <span className="text-[11px] font-normal text-amber-600">
                  beta
                </span>
              </h2>
              <p className="text-xs text-slate-600">
                Simulated IELTS Speaking practice with exam-style timing and AI
                feedback on fluency, grammar and vocabulary. Starting with text
                answers, then audio.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-[11px] uppercase tracking-wide text-amber-600">
                In development
              </span>
              <Link
                href="/speaking"
                className="rounded-md bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-black"
              >
                Preview Speaking Lab
              </Link>
            </div>
          </div>
        </section>

        {/* Roadmap / note */}
        <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-700">
          <p className="font-medium">Roadmap</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>Phase 1: Writing Lab (live).</li>
            <li>
              Phase 2: Speaking Lab beta inside this same account &amp; paywall.
            </li>
            <li>
              Phase 3: Reading &amp; Listening labs, all managed under
              IELTS-Master.AI.
            </li>
          </ul>
          <p className="mt-2 text-[11px] text-slate-500">
            Later we can point your domain root (e.g.{" "}
            <code>ielts-master.ai</code>) directly at this hub, while keeping
            Writing and Speaking as separate sections inside the same codebase
            and database.
          </p>
        </section>
      </div>
    </main>
  );
}
