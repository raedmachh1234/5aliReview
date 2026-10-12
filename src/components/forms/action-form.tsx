"use client";

import { createContext, useActionState, useContext, useEffect, useRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { idleState, translateKey, type FormState } from "@/lib/form-state";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { Checkbox, SelectInput, TextArea, TextInput } from "@/components/ui/field";
import { Alert } from "@/components/ui/surface";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

interface Ctx {
  state: FormState;
  dict: Record<string, unknown>;
}

const FormCtx = createContext<Ctx>({ state: idleState, dict: {} });

/**
 * Server-action form with accessible status handling. Server-rendered pages
 * compose it with the Form* fields below, which read their own error and
 * echoed value from context. Works without JavaScript (progressive enhancement).
 */
export function ActionForm({
  action,
  children,
  dict,
  successMessage,
  errorSummary,
  className,
  resetOnSuccess = false,
}: {
  action: Action;
  children: ReactNode;
  dict: Record<string, unknown>;
  successMessage?: string;
  /** e.g. "Please fix the {count} highlighted field(s)." */
  errorSummary: string;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "idle") return;
    statusRef.current?.focus();
    if (state.status === "success" && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  const count = Object.keys(state.fieldErrors ?? {}).length;
  return (
    <FormCtx.Provider value={{ state, dict }}>
      <form ref={formRef} action={formAction} noValidate className={className}>
        <div ref={statusRef} tabIndex={-1} className="outline-none empty:hidden">
          {state.status === "success" && (state.message || successMessage) ? (
            <Alert tone="success" role="status" className="mb-4">
              {state.message ? translateKey(dict, state.message) : successMessage}
            </Alert>
          ) : null}
          {state.status === "error" ? (
            <Alert tone="danger" role="alert" className="mb-4">
              {state.message ? translateKey(dict, state.message) : errorSummary.replace("{count}", String(count))}
            </Alert>
          ) : null}
        </div>
        {children}
      </form>
    </FormCtx.Provider>
  );
}

function useField(name: string) {
  const { state, dict } = useContext(FormCtx);
  return {
    error: translateKey(dict, state.fieldErrors?.[name]),
    echoed: state.status === "error" ? state.values?.[name] : undefined,
  };
}

type Common = { name: string; label: ReactNode; hint?: ReactNode; optionalLabel?: string };

export function FormInput({ name, id, defaultValue, ...props }: Common & Omit<InputHTMLAttributes<HTMLInputElement>, "name"> & { id?: string }) {
  const { error, echoed } = useField(name);
  return <TextInput id={id ?? `f-${name}`} name={name} error={error} defaultValue={echoed ?? defaultValue} {...props} />;
}

export function FormTextArea({ name, id, defaultValue, ...props }: Common & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name"> & { id?: string }) {
  const { error, echoed } = useField(name);
  return <TextArea id={id ?? `f-${name}`} name={name} error={error} defaultValue={echoed ?? defaultValue} {...props} />;
}

export function FormSelect({ name, id, children, defaultValue, ...props }: Common & Omit<SelectHTMLAttributes<HTMLSelectElement>, "name"> & { id?: string; children: ReactNode }) {
  const { error, echoed } = useField(name);
  return (
    <SelectInput id={id ?? `f-${name}`} name={name} error={error} defaultValue={echoed ?? defaultValue} {...props}>
      {children}
    </SelectInput>
  );
}

export function FormCheckbox({ name, id, ...props }: { name: string; label: ReactNode; hint?: ReactNode; id?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "name">) {
  const { error } = useField(name);
  return <Checkbox id={id ?? `f-${name}`} name={name} error={error} {...props} />;
}

export function SubmitButton({ children, pendingLabel, variant = "primary", className }: { children: ReactNode; pendingLabel: string; variant?: ButtonVariant; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} aria-disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
