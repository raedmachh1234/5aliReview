"use client";

import { useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/** Chips-style tag editor; submits the tags as one comma-separated `tags` field. */
export function TagInput({
  id,
  tags,
  onChange,
  max,
  invalid,
  describedBy,
}: {
  id: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  max: number;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const additions = raw
      .split(",")
      .map((t) => t.trim().replace(/\s+/g, " "))
      .filter((t) => t && !tags.some((existing) => existing.toLowerCase() === t.toLowerCase()));
    if (additions.length > 0) onChange([...tags, ...additions].slice(0, max));
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Backspace" && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border bg-surface px-2 py-1.5 transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15",
        invalid ? "border-danger" : "border-line-strong hover:border-ink/30",
      )}
    >
      <input type="hidden" name="tags" value={tags.join(", ")} />
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-surface-2 py-1 ps-2.5 pe-1 text-xs font-medium text-ink-2">
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="grid size-5 place-items-center rounded-md text-muted transition hover:bg-surface-3 hover:text-ink"
          >
            <Icon name="x" size={12} title={`Remove tag ${tag}`} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        placeholder={tags.length === 0 ? "Type a tag and press Enter" : ""}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="h-7 min-w-28 flex-1 bg-transparent px-1.5 text-sm text-ink placeholder:text-muted/80 focus:outline-none"
      />
    </div>
  );
}
