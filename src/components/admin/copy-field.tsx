"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

/** Read-only value with a copy-to-clipboard button. */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-line bg-surface-2/60 py-1.5 ps-3.5 pe-1.5">
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink-2">{value}</code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // Clipboard can be blocked (e.g. insecure context); the value stays selectable.
            }
          }}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-ink-2 transition hover:bg-surface hover:text-ink"
        >
          <Icon name={copied ? "check" : "copy"} size={14} />
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}
