import { Icon, type IconName } from "@/components/ui/icon";
import { addressLines, groupOpeningHours } from "@/lib/business";
import { cn } from "@/lib/cn";
import type { ContactLink } from "@/lib/contact";
import type { StoreSettings } from "@/lib/types";

const ROW_LABELS: Record<ContactLink["key"], string> = {
  whatsapp: "Chat on WhatsApp",
  phone: "Call us",
  email: "Email us",
  instagram: "Follow us",
  facebook: "Follow us",
};

/**
 * Contact panel: every configured way to reach or visit the store, with the
 * number or address in full. Only the first (primary) way gets the accent.
 */
export function ContactBand({ contacts, settings }: { contacts: ContactLink[]; settings: StoreSettings }) {
  const address = addressLines(settings);
  const hours = settings.openingHours.length > 0 ? groupOpeningHours(settings.openingHours) : [];
  const rows: { key: string; href: string; label: string; detail: string; icon: IconName; external: boolean }[] = [
    ...contacts.map((link) => ({ ...link, label: ROW_LABELS[link.key] })),
    ...(settings.googleMapsUrl
      ? [{ key: "maps", href: settings.googleMapsUrl, label: "Visit us", detail: "Get directions", icon: "pin" as const, external: true }]
      : []),
    ...(settings.googleReviewUrl
      ? [{ key: "review", href: settings.googleReviewUrl, label: "Happy with us?", detail: "Review us on Google", icon: "star" as const, external: true }]
      : []),
  ];
  if (rows.length === 0 && address.length === 0) return null;

  return (
    <section id="contact" aria-labelledby="contact-title" className="container-page scroll-mt-20">
      <div className="grid gap-10 rounded-3xl bg-surface-2 p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14 lg:p-14">
        <div>
          {/* "Hello" in Tunisian Arabic. */}
          <p lang="aeb-Latn" className="text-sm font-medium text-accent-text">
            Aslema!
          </p>
          <h2 id="contact-title" className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-balance sm:text-4xl">
            Questions or ready to order?
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-pretty text-ink-2">
            Call or email us to place an order, ask about a product or get advice on the right setup for your business.
          </p>
          {address.length > 0 || hours.length > 0 ? (
            <div className="mt-6 space-y-2.5 text-sm text-muted">
              {address.length > 0 ? (
                <address className="flex items-start gap-2.5 not-italic">
                  <Icon name="pin" size={16} className="mt-0.5 shrink-0" />
                  <span>{address.join(", ")}</span>
                </address>
              ) : null}
              {hours.length > 0 ? (
                <p className="flex items-start gap-2.5">
                  <Icon name="clock" size={16} className="mt-0.5 shrink-0" />
                  <span>{hours.map((h) => `${h.days} ${h.hours}`).join(" · ")}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {rows.length > 0 ? (
          <ul className="grid gap-3">
            {rows.map((row, i) => (
              <li key={row.key}>
                <a
                  href={row.href}
                  {...(row.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group flex min-h-18 items-center gap-4 rounded-2xl bg-surface p-4 ring-1 ring-line transition hover:ring-line-strong active:scale-[0.98]"
                >
                  <span
                    className={cn(
                      "grid size-11 shrink-0 place-items-center rounded-full",
                      i === 0 ? "bg-accent text-accent-contrast" : "bg-surface-2 text-ink-2",
                    )}
                  >
                    <Icon name={row.icon} size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-muted">{row.label}</span>
                    <span className="block truncate font-medium tabular sm:text-lg">{row.detail}</span>
                  </span>
                  <Icon name="arrowUpRight" size={18} className="shrink-0 text-muted transition group-hover:text-ink" />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
