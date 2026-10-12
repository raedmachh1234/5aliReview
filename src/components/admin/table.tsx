import type { ReactNode } from "react";

/** Simple accessible data table for admin lists (scrollable region on small screens). */
export function AdminTable({ label, head, children, minWidth = "40rem" }: { label: string; head: ReactNode[]; children: ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={label}>
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-line text-xs font-semibold tracking-wide text-ink-2 uppercase">
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-5 py-3 text-start">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-line [&>tr:last-child]:border-0 [&_td]:px-5 [&_td]:py-3 [&_th]:px-5 [&_th]:py-3">{children}</tbody>
      </table>
    </div>
  );
}

export const adminDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
