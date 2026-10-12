import { cn } from "@/lib/cn";

/** 5ali Review wordmark: a card with a tap arc and a star. Decorative mark + text name. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <rect x="2" y="2" width="36" height="36" rx="11" fill="#0b5c47" />
      <path d="M12 13.5a9 9 0 010 13M16 10.5a13.5 13.5 0 010 19" fill="none" stroke="#e3f1eb" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M26.5 12.5l2 4.1 4.5.7-3.3 3.2.8 4.5-4-2.1-4 2.1.8-4.5-3.3-3.2 4.5-.7z" fill="#f5b72f" />
    </svg>
  );
}

export function Logo({ className, textClassName }: { className?: string; textClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className={cn("text-[1.15rem] font-extrabold tracking-tight text-ink", textClassName)}>
        5ali<span className="text-pine"> Review</span>
      </span>
    </span>
  );
}
