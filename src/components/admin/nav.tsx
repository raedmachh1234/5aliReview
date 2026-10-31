"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const items: { href: string; label: string; icon: IconName; exact?: boolean }[] = [
  { href: "/admin", label: "Overview", icon: "grid", exact: true },
  { href: "/admin/products", label: "Products", icon: "box" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

export function AdminNav({ orientation }: { orientation: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  return (
    <ul className={cn(orientation === "vertical" ? "space-y-1" : "no-scrollbar flex gap-1 overflow-x-auto")}>
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl text-sm font-medium transition",
                orientation === "vertical" ? "px-3 py-2.5" : "px-3 py-2",
                active ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface-2/60 hover:text-ink",
              )}
            >
              <Icon name={item.icon} size={18} className={active ? "text-accent-text" : undefined} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
