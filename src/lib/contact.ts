import type { IconName } from "@/components/ui/icon";
import { digitsOnly } from "./format";
import type { StoreSettings } from "./types";

export interface ContactLink {
  key: "whatsapp" | "phone" | "email" | "instagram" | "facebook";
  label: string;
  detail: string;
  href: string;
  icon: IconName;
  external: boolean;
}

/** The ways a customer can reach the store, in display order. Empty settings are skipped. */
export function contactLinks(settings: StoreSettings, message?: string): ContactLink[] {
  const links: ContactLink[] = [];
  const wa = digitsOnly(settings.whatsapp);
  if (wa) {
    links.push({
      key: "whatsapp",
      label: "WhatsApp",
      detail: settings.whatsapp,
      href: `https://wa.me/${wa}${message ? `?text=${encodeURIComponent(message)}` : ""}`,
      icon: "whatsapp",
      external: true,
    });
  }
  const phone = settings.phone.replace(/[^\d+]/g, "");
  if (phone) links.push({ key: "phone", label: "Call", detail: settings.phone, href: `tel:${phone}`, icon: "phone", external: false });
  if (settings.email) {
    links.push({
      key: "email",
      label: "Email",
      detail: settings.email,
      href: `mailto:${settings.email}${message ? `?subject=${encodeURIComponent(message)}` : ""}`,
      icon: "mail",
      external: false,
    });
  }
  if (settings.instagram) {
    links.push({ key: "instagram", label: "Instagram", detail: "Instagram", href: settings.instagram, icon: "instagram", external: true });
  }
  if (settings.facebook) {
    links.push({ key: "facebook", label: "Facebook", detail: "Facebook", href: settings.facebook, icon: "facebook", external: true });
  }
  return links;
}
