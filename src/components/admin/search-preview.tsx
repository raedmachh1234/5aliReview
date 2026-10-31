import { cn } from "@/lib/cn";

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** Approximation of a Google result: Google cuts titles near 60 and descriptions near 155 characters. */
export function SearchPreview({ siteName, url, title, description }: { siteName: string; url: string; title: string; description: string }) {
  let display = url;
  try {
    const parsed = new URL(url);
    display = [parsed.host, ...parsed.pathname.split("/").filter(Boolean)].join(" › ");
  } catch {
    // keep the raw value
  }
  return (
    <div className="rounded-2xl border border-line bg-surface p-4" aria-label="Preview of the Google search result">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-ink-2">
          {Array.from(siteName.trim())[0]?.toUpperCase() ?? "S"}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm text-ink">{siteName || "Your store"}</p>
          <p className="truncate text-xs text-muted">{display}</p>
        </div>
      </div>
      <p className="mt-2 text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">{clip(title || "Page title", 62)}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">
        {description ? clip(description, 158) : <span className="text-muted">Google will pick text from the page.</span>}
      </p>
    </div>
  );
}

/** "42 / 60" counter that turns amber past the recommended length. */
export function CharCount({ value, recommended, id }: { value: string; recommended: number; id?: string }) {
  const over = value.length > recommended;
  return (
    <span id={id} className={cn("text-xs tabular", over ? "text-warn" : "text-muted")}>
      {value.length} / {recommended}
      {over ? " — may be cut off" : ""}
    </span>
  );
}
