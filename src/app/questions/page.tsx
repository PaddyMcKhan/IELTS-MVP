import Link from "next/link";

function HubCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link href={href} className="block rounded-lg border bg-white p-6 hover:border-slate-300 hover:bg-slate-50">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{desc}</div>
      <div className="mt-4 text-sm font-medium text-slate-900">Open →</div>
    </Link>
  );
}

export default function QuestionsHubPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Questions</h1>
      <p className="mt-1 text-sm text-slate-600">Choose a module.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <HubCard
          title="Writing questions"
          desc="Task 1 and Task 2 question bank."
          href="/questions/writing"
        />
        <HubCard
          title="Speaking questions"
          desc="Part 1/2/3 prompts (coming next)."
          href="/questions/speaking"
        />
      </div>
    </div>
  );
}
