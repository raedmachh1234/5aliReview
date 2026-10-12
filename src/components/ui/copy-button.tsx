"use client";

import { useState } from "react";
import { Icon } from "./icon";

/** Copies text to the clipboard and announces the result politely. */
export function CopyButton({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-sm font-semibold text-ink-2 hover:text-ink"
    >
      <Icon name={copied ? "check" : "copy"} size={16} />
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}
