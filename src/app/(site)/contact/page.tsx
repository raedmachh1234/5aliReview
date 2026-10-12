import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { rich } from "@/i18n/rich";
import { company } from "@/config/company";
import { ContactForm } from "@/components/forms/contact-form";
import { Card } from "@/components/ui/surface";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.contactTitle, description: t.meta.contactDescription, alternates: { canonical: "/contact" } };
}

export default async function ContactPage() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.3fr]">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-ink">{t.contact.title}</h1>
        <p className="mt-4 text-lg text-ink-2">{t.contact.lead}</p>
        <p className="mt-6 text-ink-2">
          {rich(t.contact.emailUs, {
            email: (
              <a href={`mailto:${company.contactEmail}`} className="font-semibold text-pine underline underline-offset-4">
                {company.contactEmail}
              </a>
            ),
          })}
        </p>
      </div>
      <Card className="p-6 sm:p-8">
        <ContactForm t={{ contact: t.contact, validation: t.validation, errors: t.errors, common: t.common }} />
      </Card>
    </div>
  );
}
