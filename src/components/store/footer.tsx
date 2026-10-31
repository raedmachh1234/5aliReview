import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { addressLines, groupOpeningHours } from "@/lib/business";
import type { ContactLink } from "@/lib/contact";
import type { StoreSettings } from "@/lib/types";
import { Brand } from "./brand";

export function StoreFooter({ settings, contacts }: { settings: StoreSettings; contacts: ContactLink[] }) {
  const reach = contacts.filter((c) => c.key === "whatsapp" || c.key === "phone" || c.key === "email");
  const social = contacts.filter((c) => c.key === "instagram" || c.key === "facebook");
  const address = addressLines(settings);
  const hours = settings.openingHours.length > 0 ? groupOpeningHours(settings.openingHours) : [];
  const hasVisit = address.length > 0 || hours.length > 0 || settings.googleMapsUrl || settings.googleReviewUrl;
  const heading = "text-sm font-semibold text-ink";
  const link = "inline-block py-1 text-muted transition hover:text-ink";
  const action = "inline-flex min-h-7 items-center gap-2 font-medium text-accent-text transition hover:text-ink";

  return (
    <footer className="mt-20 border-t border-line sm:mt-28">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr_1.2fr]">
        <div className="max-w-xs">
          <Brand name={settings.storeName} />
          {settings.tagline ? <p className="mt-4 text-sm leading-relaxed text-muted">{settings.tagline}</p> : null}
          {social.length > 0 ? (
            <ul className="mt-5 flex gap-2">
              {social.map((item) => (
                <li key={item.key}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid size-10 place-items-center rounded-full text-ink-2 ring-1 ring-line transition hover:bg-surface-2 hover:text-ink"
                  >
                    <Icon name={item.icon} title={item.label} size={18} />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <nav aria-label="Footer">
          <h2 className={heading}>Shop</h2>
          <ul className="mt-3 space-y-0.5 text-sm">
            <li>
              <Link href="/products" className={link}>
                Products
              </Link>
            </li>
            <li>
              <Link href="/#how-it-works" className={link}>
                How it works
              </Link>
            </li>
          </ul>
        </nav>

        {reach.length > 0 ? (
          <div>
            <h2 className={heading}>Contact</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {reach.map((item) => (
                <li key={item.key}>
                  <a
                    href={item.href}
                    {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="inline-flex min-h-9 items-center gap-2.5 text-ink-2 transition hover:text-ink"
                  >
                    <Icon name={item.icon} size={16} className="shrink-0 text-muted" />
                    <span className="tabular">{item.detail}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {hasVisit ? (
          <div>
            <h2 className={heading}>Visit us</h2>
            {address.length > 0 ? (
              <address className="mt-4 flex items-start gap-2.5 text-sm text-ink-2 not-italic">
                <Icon name="pin" size={16} className="mt-0.5 shrink-0 text-muted" />
                <span>
                  {address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </span>
              </address>
            ) : null}
            {hours.length > 0 ? (
              <dl className="mt-4 space-y-1 text-sm">
                {hours.map((h) => (
                  <div key={h.days} className="flex justify-between gap-4">
                    <dt className="text-muted">{h.days}</dt>
                    <dd className="text-ink-2 tabular">{h.hours}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <ul className="mt-4 space-y-2 text-sm">
              {settings.googleMapsUrl ? (
                <li>
                  <a href={settings.googleMapsUrl} target="_blank" rel="noopener noreferrer" className={action}>
                    Get directions <Icon name="arrowUpRight" size={14} />
                  </a>
                </li>
              ) : null}
              {settings.googleReviewUrl ? (
                <li>
                  <a href={settings.googleReviewUrl} target="_blank" rel="noopener noreferrer" className={action}>
                    Review us on Google <Icon name="arrowUpRight" size={14} />
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="border-t border-line">
        <p className="container-page py-6 text-xs text-muted">
          © {new Date().getFullYear()} {settings.storeName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
