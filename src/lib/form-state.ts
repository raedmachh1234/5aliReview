import type { ZodError } from "zod";

/**
 * Result of a server action backing a form. Errors are i18n keys
 * ("validation.email", "errors.generic") translated by the client form.
 */
export type FormState = {
  status: "idle" | "success" | "error";
  /** i18n key of a form-level message. */
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Echo of submitted text values so the form keeps them after a server error (never passwords). */
  values?: Record<string, string>;
};

export const idleState: FormState = { status: "idle" };

export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message.includes(".") ? issue.message : "validation.invalid";
  }
  return out;
}

export function echoValues(formData: FormData, fields: string[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f, String(formData.get(f) ?? "")]));
}

/** Resolves "validation.email" against a dictionary. */
export function translateKey(dict: Record<string, unknown>, key: string | undefined): string | undefined {
  if (!key) return undefined;
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in node) node = (node as Record<string, unknown>)[part];
    else return key;
  }
  return typeof node === "string" ? node : key;
}

/** The dictionary slice client forms need to translate message keys (keeps payloads small). */
export function formDict<T extends { validation: unknown; errors: unknown; common: { saved: string } }>(t: T, extra: Record<string, unknown> = {}) {
  return { validation: t.validation, errors: t.errors, common: { saved: t.common.saved }, ...extra } as Record<string, unknown>;
}
