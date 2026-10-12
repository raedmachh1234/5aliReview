import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";

/** KPI stat tile: label, one big number, and a short supporting line. */
export function Kpi({ label, value, suffix, sub, icon }: { label: string; value: ReactNode; suffix?: string; sub?: ReactNode; icon: IconName }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink-2">{label}</h2>
        <span className="grid size-9 place-items-center rounded-xl bg-pine-soft text-pine">
          <Icon name={icon} size={18} />
        </span>
      </div>
      <p className="mt-3 flex items-baseline gap-1">
        <span className="tabular text-[2rem] leading-none font-extrabold tracking-tight text-ink">{value}</span>
        {suffix ? <span className="text-sm font-semibold text-muted">{suffix}</span> : null}
      </p>
      {sub ? <p className="mt-2 text-sm text-muted">{sub}</p> : null}
    </div>
  );
}
