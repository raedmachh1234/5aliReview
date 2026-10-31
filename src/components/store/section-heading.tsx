import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export function SectionHeading({
  id,
  eyebrow,
  title,
  href,
  linkLabel = "View all",
}: {
  id: string;
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6 sm:mb-10">
      <div>
        {eyebrow ? <p className="text-sm font-medium text-accent-text">{eyebrow}</p> : null}
        <h2 id={id} className="mt-2 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
          {title}
        </h2>
      </div>
      {href ? (
        <Link
          href={href}
          className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-medium text-ink-2 transition hover:text-ink"
        >
          {linkLabel}
          <Icon name="arrowRight" size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}
