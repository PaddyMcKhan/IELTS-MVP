import PageShell from "@/components/layout/PageShell";

export default function ProfilePage() {
  return (
    <PageShell
      title="Profile"
      description="We’ll wire this up to your account data once Supabase and auth are 100% stable again."
    >
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-medium text-slate-200">Account</h2>
        <p className="mt-2 text-sm text-slate-400">
          This is a placeholder profile page. Right now it’s intentionally not
          doing any authentication or database calls, so it can’t break while we
          fix the underlying data issues.
        </p>
      </section>
    </PageShell>
  );
}
