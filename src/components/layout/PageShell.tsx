// src/components/layout/PageShell.tsx
import type { ReactNode } from "react";

type PageShellProps = {
  title?: string;
  description?: string;
  className?: string;
  children: ReactNode;
};

export default function PageShell({
  title,
  description,
  className,
  children,
}: PageShellProps) {
  const baseClasses =
    "mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-8";

  const mergedClassName = className
    ? `${baseClasses} ${className}`
    : baseClasses;

  return (
    <main className={mergedClassName}>
      {(title || description) && (
        <header>
          {title && (
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {title}
            </h1>
          )}
          {description && (
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          )}
        </header>
      )}

      {children}
    </main>
  );
}
