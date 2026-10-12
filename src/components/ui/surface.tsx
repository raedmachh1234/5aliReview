import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-line bg-surface shadow-card", className)} {...props} />;
}

export function CardHeader({ title, description, action, as: Heading = "h2", id }: { title: ReactNode; description?: ReactNode; action?: ReactNode; as?: "h2" | "h3"; id?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <Heading id={id} className="text-base font-bold text-ink">
          {title}
        </Heading>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

type Tone = "neutral" | "success" | "warn" | "danger" | "brand";

const badgeTones: Record<Tone, string> = {
  neutral: "bg-subtle text-ink-2 border-line",
  success: "bg-success-soft text-success border-success/30",
  warn: "bg-warn-soft text-warn border-warn/30",
  danger: "bg-danger-soft text-danger border-danger/30",
  brand: "bg-pine-soft text-pine border-pine/20",
};

/** Status badge — always carries text, never colour alone. */
export function Badge({ tone = "neutral", icon, children, className }: { tone?: Tone; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", badgeTones[tone], className)}>
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </span>
  );
}

const alertTones: Record<Exclude<Tone, "brand">, { cls: string; icon: IconName }> = {
  neutral: { cls: "border-line bg-surface text-ink-2", icon: "info" },
  success: { cls: "border-success/30 bg-success-soft text-ink", icon: "checkCircle" },
  warn: { cls: "border-warn/30 bg-warn-soft text-ink", icon: "alert" },
  danger: { cls: "border-danger/30 bg-danger-soft text-ink", icon: "alert" },
};

export function Alert({
  tone = "neutral",
  title,
  children,
  role,
  className,
}: {
  tone?: Exclude<Tone, "brand">;
  title?: ReactNode;
  children?: ReactNode;
  role?: "alert" | "status";
  className?: string;
}) {
  const t = alertTones[tone];
  return (
    <div role={role} className={cn("flex gap-3 rounded-xl border p-4 text-sm", t.cls, className)}>
      <Icon name={t.icon} className={cn("mt-0.5 shrink-0", tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : tone === "warn" ? "text-warn" : "text-muted")} />
      <div className="space-y-1">
        {title ? <p className="font-semibold text-ink">{title}</p> : null}
        {children ? <div className="leading-relaxed">{children}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({ icon = "info", title, children, action }: { icon?: IconName; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-pine-soft text-pine">
        <Icon name={icon} size={24} />
      </span>
      <p className="text-base font-bold text-ink">{title}</p>
      {children ? <p className="mt-1 max-w-md text-sm text-muted">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-subtle", className)} />;
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-[0.95rem] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
