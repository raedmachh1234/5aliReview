import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { absoluteUrl } from "@/config/site";
import { company } from "@/config/company";
import { logger } from "@/server/security/logger";

/**
 * Email sending. No email provider is integrated yet: the default provider
 * only logs that a message would be sent (never its content or recipient).
 * Plug a real provider into `setEmailProvider()` and list it in
 * src/config/third-parties.ts + the Subprocessors page before using it.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

let provider: EmailProvider = {
  async send(message) {
    logger.info("email_not_sent_no_provider", { subject: message.subject });
  },
};

export function setEmailProvider(p: EmailProvider): void {
  provider = p;
}

/** Transactional email (account, invoices). Not subject to marketing consent. */
export async function sendTransactional(message: EmailMessage): Promise<void> {
  await provider.send(message);
}

export function newUnsubscribeToken(): { token: string; tokenHash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, tokenHash: createHash("sha256").update(token).digest("hex") };
}

/**
 * Marketing email. Callers must pass the recipient's subscription record;
 * unsubscribed or missing consent → nothing is sent. Every message gets a
 * visible unsubscribe link and RFC 8058 one-click headers.
 */
export async function sendMarketing(
  subscription: { email: string; unsubscribedAt: string | null; consentAt: string | null },
  unsubscribeToken: string,
  message: Omit<EmailMessage, "to" | "headers">,
): Promise<boolean> {
  if (!subscription.consentAt || subscription.unsubscribedAt) return false;
  const url = absoluteUrl(`/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`);
  const oneClick = absoluteUrl(`/api/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`);
  const footer = `\n\n—\nYou receive this because you opted in to product news from ${company.tradeName}.\nUnsubscribe in one click: ${url}\n${company.legalName}, ${company.address}`;
  await provider.send({
    to: subscription.email,
    subject: message.subject,
    text: `${message.text}${footer}`,
    html: message.html
      ? `${message.html}<hr><p style="font-size:13px;color:#475467">You receive this because you opted in to product news from ${company.tradeName}. <a href="${url}">Unsubscribe</a> in one click.<br>${company.legalName}, ${company.address}</p>`
      : undefined,
    headers: {
      "List-Unsubscribe": `<${oneClick}>, <mailto:${company.privacyEmail}?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
  return true;
}
