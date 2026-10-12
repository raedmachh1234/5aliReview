"use client";

import { useEffect, useRef } from "react";
import type { FormState } from "@/lib/form-state";
import { translateKey } from "@/lib/form-state";
import { Alert } from "@/components/ui/surface";

/**
 * Accessible form result summary: success/error messages are announced and
 * receive focus so keyboard and screen-reader users know what happened.
 */
export function FormStatus({
  state,
  dict,
  successMessage,
  errorSummaryTemplate,
}: {
  state: FormState;
  dict: Record<string, unknown>;
  successMessage?: string;
  /** e.g. "Please fix the {count} highlighted field(s)." */
  errorSummaryTemplate: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status !== "idle") ref.current?.focus();
  }, [state]);

  const fieldCount = Object.keys(state.fieldErrors ?? {}).length;
  return (
    <div ref={ref} tabIndex={-1} className="outline-none empty:hidden">
      {state.status === "success" && successMessage ? (
        <Alert tone="success" role="status">
          {successMessage}
        </Alert>
      ) : null}
      {state.status === "error" ? (
        <Alert tone="danger" role="alert">
          {state.message ? translateKey(dict, state.message) : errorSummaryTemplate.replace("{count}", String(fieldCount))}
        </Alert>
      ) : null}
    </div>
  );
}

export function fieldError(state: FormState, dict: Record<string, unknown>, field: string): string | undefined {
  return translateKey(dict, state.fieldErrors?.[field]);
}
