import Link from "next/link";
import { cn } from "@/lib/cn";

/** Store logo: the initial in an arched doorway, like the blue doors of Sidi Bou Said. */
export function BrandMark({ name, className }: { name: string; className?: string }) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "S";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-t-full rounded-b-[0.3rem] bg-accent pt-[0.2em] text-base leading-none font-semibold text-accent-contrast",
        className,
      )}
    >
      {initial}
    </span>
  );
}

/** Storefront logo: the arched mark beside the store name. */
export function Brand({ name, href = "/", className }: { name: string; href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex min-w-0 items-center gap-2.5 rounded-lg", className)}>
      <BrandMark name={name} />
      <span className="truncate text-lg font-semibold tracking-[-0.02em]">{name}</span>
    </Link>
  );
}
