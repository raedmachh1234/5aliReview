"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

/**
 * Disclosure menu for small screens: a real <button> with aria-expanded,
 * Escape closes it and returns focus to the toggle, and it closes on navigation.
 */
export function MobileMenu({ openLabel, closeLabel, children }: { openLabel: string; closeLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={toggle}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-ink"
      >
        <Icon name={open ? "x" : "menu"} title={open ? closeLabel : openLabel} />
      </button>
      <div id={panelId} hidden={!open} className="absolute inset-x-0 top-full z-30 border-b border-line bg-surface px-4 pt-2 pb-5 shadow-lg">
        {children}
      </div>
    </div>
  );
}
