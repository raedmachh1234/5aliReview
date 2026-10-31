import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "accent" | "success" | "warn" | "danger" | "inverse";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-ink-2 ring-line",
  accent: "bg-accent-soft text-accent-text ring-accent/20",
  success: "bg-success-soft text-success ring-success/20",
  warn: "bg-warn-soft text-warn ring-warn/25",
  danger: "bg-danger-soft text-danger ring-danger/20",
  inverse: "bg-ink text-bg ring-transparent",
};

export function Badge({
  tone = "neutral",
  dot,
  className,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {dot ? <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
