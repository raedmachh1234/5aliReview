"use client";

import { useActionState } from "react";
import { submitContact } from "@/server/actions/public-forms";
import { idleState } from "@/lib/form-state";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Checkbox, TextArea, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormStatus, fieldError } from "./form-status";

export function ContactForm({ t }: { t: Pick<Dictionary, "contact" | "validation" | "errors" | "common"> }) {
  const [state, action, pending] = useActionState(submitContact, idleState);
  const err = (f: string) => fieldError(state, t, f);
  const v = state.values ?? {};

  if (state.status === "success") {
    return <FormStatus state={state} dict={t} successMessage={t.contact.success} errorSummaryTemplate={t.errors.formErrors} />;
  }

  return (
    <form action={action} noValidate className="space-y-5">
      <FormStatus state={state} dict={t} errorSummaryTemplate={t.errors.formErrors} />
      <p className="rounded-xl bg-canvas p-4 text-sm leading-relaxed text-ink-2">{t.contact.whatWeCollect}</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput id="name" name="name" label={t.contact.name} required autoComplete="name" defaultValue={v.name} error={err("name")} />
        <TextInput id="email" name="email" type="email" label={t.contact.email} required autoComplete="email" inputMode="email" defaultValue={v.email} error={err("email")} />
      </div>
      <TextInput
        id="businessName"
        name="businessName"
        label={t.contact.businessName}
        optionalLabel={t.common.optional}
        autoComplete="organization"
        defaultValue={v.businessName}
        error={err("businessName")}
      />
      <TextArea id="message" name="message" label={t.contact.message} hint={t.contact.messageHint} required rows={5} defaultValue={v.message} error={err("message")} />
      {/* Honeypot for bots — hidden from people and assistive tech. */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <Checkbox id="marketingOptIn" name="marketingOptIn" label={t.contact.marketing} hint={t.contact.marketingHint} />
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? t.contact.sending : t.contact.submit}
      </Button>
    </form>
  );
}
