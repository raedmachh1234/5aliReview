import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Accessible form field: visible label, optional hint, and an error that is
 * linked with aria-describedby and announced via aria-invalid.
 */
export const controlClass =
  "block w-full rounded-xl border border-control bg-surface px-3.5 py-2.5 text-[0.95rem] text-ink placeholder:text-muted aria-[invalid=true]:border-danger aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-danger disabled:bg-subtle";

interface FieldProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  optionalLabel?: string;
  children: (describedBy: string | undefined, invalid: boolean) => ReactNode;
  className?: string;
}

export function Field({ id, label, hint, error, required, optionalLabel, children, className }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
        {!required && optionalLabel ? <span className="ms-1 font-normal text-muted">({optionalLabel})</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {children(describedBy, Boolean(error))}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-medium text-danger">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l9.5 17h-19zM12 10v4M12 17h.01" />
          </svg>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  id,
  label,
  hint,
  error,
  optionalLabel,
  className,
  ...props
}: Omit<FieldProps, "children"> & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={props.required} optionalLabel={optionalLabel} className={className}>
      {(describedBy, invalid) => (
        <input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={controlClass} {...props} />
      )}
    </Field>
  );
}

export function TextArea({
  id,
  label,
  hint,
  error,
  optionalLabel,
  className,
  ...props
}: Omit<FieldProps, "children"> & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={props.required} optionalLabel={optionalLabel} className={className}>
      {(describedBy, invalid) => (
        <textarea id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={cn(controlClass, "min-h-28")} {...props} />
      )}
    </Field>
  );
}

export function SelectInput({
  id,
  label,
  hint,
  error,
  optionalLabel,
  className,
  children,
  ...props
}: Omit<FieldProps, "children"> & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <Field id={id} label={label} hint={hint} error={error} required={props.required} optionalLabel={optionalLabel} className={className}>
      {(describedBy, invalid) => (
        <select id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={controlClass} {...props}>
          {children}
        </select>
      )}
    </Field>
  );
}

/** Checkbox with its label to the side. Never pre-checked for optional consent. */
export function Checkbox({
  id,
  label,
  hint,
  error,
  ...props
}: { id: string; label: ReactNode; hint?: ReactNode; error?: string | null } & InputHTMLAttributes<HTMLInputElement>) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 size-5 shrink-0 rounded border-control accent-pine"
          {...props}
        />
        <label htmlFor={id} className="text-sm leading-relaxed text-ink-2">
          {label}
        </label>
      </div>
      {hint ? (
        <p id={hintId} className="ps-8 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="ps-8 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
