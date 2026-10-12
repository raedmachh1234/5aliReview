"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "@/server/actions/auth";
import { idleState } from "@/lib/form-state";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { rich } from "@/i18n/rich";
import { Checkbox, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormStatus, fieldError } from "./form-status";

type AuthDict = Pick<Dictionary, "auth" | "validation" | "errors" | "common">;

export function LoginForm({ t, next }: { t: AuthDict; next?: string }) {
  const [state, action, pending] = useActionState(signIn, idleState);
  const err = (f: string) => fieldError(state, t, f);
  return (
    <form action={action} noValidate className="space-y-5">
      <FormStatus state={state} dict={t} errorSummaryTemplate={t.errors.formErrors} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <TextInput id="email" name="email" type="email" label={t.auth.email} required autoComplete="username" inputMode="email" defaultValue={state.values?.email} error={err("email")} />
      <TextInput id="password" name="password" type="password" label={t.auth.password} required autoComplete="current-password" error={err("password")} />
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? t.auth.signingIn : t.auth.submitLogin}
      </Button>
    </form>
  );
}

export function SignupForm({ t }: { t: AuthDict }) {
  const [state, action, pending] = useActionState(signUp, idleState);
  const err = (f: string) => fieldError(state, t, f);
  const v = state.values ?? {};

  if (state.status === "success") {
    return <FormStatus state={state} dict={t} successMessage={t.auth.checkEmail} errorSummaryTemplate={t.errors.formErrors} />;
  }

  const link = (href: string, label: string) => (
    <Link href={href} target="_blank" className="font-semibold text-ink underline underline-offset-4">
      {label}
    </Link>
  );

  return (
    <form action={action} noValidate className="space-y-5">
      <FormStatus state={state} dict={t} errorSummaryTemplate={t.errors.formErrors} />
      <p className="rounded-xl bg-canvas p-4 text-sm leading-relaxed text-ink-2">{t.auth.whatWeCollect}</p>
      <TextInput id="fullName" name="fullName" label={t.auth.fullName} required autoComplete="name" defaultValue={v.fullName} error={err("fullName")} />
      <TextInput id="businessName" name="businessName" label={t.auth.businessName} required autoComplete="organization" defaultValue={v.businessName} error={err("businessName")} />
      <TextInput id="email" name="email" type="email" label={t.auth.email} required autoComplete="email" inputMode="email" defaultValue={v.email} error={err("email")} />
      <TextInput id="password" name="password" type="password" label={t.auth.password} hint={t.auth.passwordHint} required minLength={10} autoComplete="new-password" error={err("password")} />
      <Checkbox
        id="acceptTerms"
        name="acceptTerms"
        required
        label={rich(t.auth.acceptTerms, { terms: link("/legal/terms", t.auth.terms), privacy: link("/legal/privacy", t.auth.privacy) })}
        hint={t.auth.ageNote}
        error={err("acceptTerms")}
      />
      {/* Optional and unticked by default — separate from the required terms checkbox. */}
      <Checkbox id="marketingOptIn" name="marketingOptIn" label={t.auth.marketing} />
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? t.auth.creating : t.auth.submitSignup}
      </Button>
    </form>
  );
}
