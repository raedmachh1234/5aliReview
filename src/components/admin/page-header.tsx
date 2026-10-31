import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ title, description, children, className }: { title?: string; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-3xl border border-line bg-surface p-5 sm:p-6", className)}>
      {title ? (
        <header className="mb-5">
          <h2 className="text-[0.95rem] font-semibold tracking-tight">{title}</h2>
          {description ? <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
