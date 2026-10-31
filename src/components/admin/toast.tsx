"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { FormState } from "@/lib/types";

/**
 * A single auto-dismissing toast. Each new `state` object (from
 * useActionState) or `flash` message shows it again; the live region makes
 * screen readers announce it.
 */
export function Toast({ state, flash }: { state?: FormState; flash?: string | null }) {
  const message =
    state && state.status !== "idle"
      ? { key: state as object | string, tone: state.status, text: state.message }
      : flash
        ? { key: flash, tone: "success" as const, text: flash }
        : null;
  const [dismissed, setDismissed] = useState<object | string | null>(null);
  const key = message?.key ?? null;

  useEffect(() => {
    if (key === null) return;
    const timer = setTimeout(() => setDismissed(key), 4500);
    return () => clearTimeout(timer);
  }, [key]);

  const visible = message && dismissed !== message.key;

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:end-6 sm:bottom-6"
    >
      {visible ? (
        <div className="pointer-events-auto flex max-w-sm animate-toast items-center gap-3 rounded-2xl border border-line bg-surface py-2.5 ps-3 pe-2 text-sm shadow-[0_20px_50px_-15px_rgb(0_0_0/0.35)]">
          <span
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-full",
              message.tone === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            )}
          >
            <Icon name={message.tone === "success" ? "check" : "alert"} size={15} />
          </span>
          <p className="font-medium text-ink">{message.text}</p>
          <button
            type="button"
            onClick={() => setDismissed(message.key)}
            className="ms-1 grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <Icon name="x" size={15} title="Dismiss" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
