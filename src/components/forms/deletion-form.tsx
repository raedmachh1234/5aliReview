"use client";

import { useActionState } from "react";
import { submitDeletionRequest } from "@/server/actions/public-forms";
import { idleState } from "@/lib/form-state";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { Checkbox, SelectInput, TextArea, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormStatus, fieldError } from "./form-status";

export function DeletionForm({ t }: { t: Pick<Dictionary, "deletion" | "validation" | "errors" | "common"> }) {
  const [state, action, pending] = useActionState(submitDeletionRequest, idleState);
  const err = (f: string) => fieldError(state, t, f);
  const v = state.values ?? {};
  const d = t.deletion;

  if (state.status === "success") {
    return <FormStatus state={state} dict={t} successMessage={d.success} errorSummaryTemplate={t.errors.formErrors} />;
  }

  return (
    <form action={action} noValidate className="space-y-5">
      <FormStatus state={state} dict={t} errorSummaryTemplate={t.errors.formErrors} />
      <TextInput id="email" name="email" type="email" label={d.email} hint={d.emailHint} required autoComplete="email" defaultValue={v.email} error={err("email")} />
      <SelectInput id="scope" name="scope" label={d.scope} required defaultValue={v.scope || ""} error={err("scope")}>
        <option value="" disabled>
          —
        </option>
        {(["account", "business", "marketing", "other"] as const).map((s) => (
          <option key={s} value={s}>
            {d.scopes[s]}
          </option>
        ))}
      </SelectInput>
      <TextArea id="details" name="details" label={d.details} hint={d.detailsHint} optionalLabel={t.common.optional} rows={4} defaultValue={v.details} error={err("details")} />
      <div aria-hidden="true" className="hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <Checkbox id="confirm" name="confirm" required label={d.confirm} error={err("confirm")} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? d.sending : d.submit}
      </Button>
    </form>
  );
}
