import Link from "next/link";
import { AuthButtons } from "@/components/AuthButtons";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white px-6">
      <div className="mx-auto max-w-3xl h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Link href="/" className="text-sm font-semibold text-slate-900">
            IELTS Writing Practice
          </Link>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            AI Examiner · Beta
          </span>
        </div>

        {/* Nav + Auth */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-3 text-xs sm:text-sm">
            <Link
              href="/"
              className="text-slate-600 hover:text-slate-900"
            >
              Practice
            </Link>
            <Link
              href="/attempts"
              className="text-slate-600 hover:text-slate-900"
            >
              My attempts
            </Link>
            <Link
              href="https://github.com/"
              target="_blank"
              className="text-slate-400 hover:text-slate-700"
            >
              GitHub
            </Link>
          </nav>

          <AuthButtons />
        </div>
      </div>
    </header>
  );
}
