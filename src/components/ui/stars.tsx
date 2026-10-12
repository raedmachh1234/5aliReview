import { cn } from "@/lib/cn";

/**
 * Read-only star display. The visual stars are hidden from assistive tech;
 * the accessible name is the text label (e.g. "4 out of 5 stars"), and a
 * visible number is shown too so colour is never the only signal.
 */
export function Stars({ rating, label, size = 16, showNumber = true, className }: { rating: number; label: string; size?: number; showNumber?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" className={i <= rating ? "text-star" : "text-control"}>
            <path
              d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"
              fill={i <= rating ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={i <= rating ? 0 : 1.6}
              strokeLinejoin="round"
            />
          </svg>
        ))}
      </span>
      {showNumber ? (
        <span aria-hidden="true" className="tabular text-sm font-semibold text-ink">
          {rating}/5
        </span>
      ) : null}
    </span>
  );
}
