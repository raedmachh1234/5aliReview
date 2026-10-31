import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Accessible form field: visible label, optional hint, and an error that is
 * linked with aria-describedby and announced via aria-invalid.
 */
export const controlClass =
  "block w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-ink shadow-xs transition-[border-color,box-shadow] duration-150 placeholder:text-muted/80 hover:border-ink/30 focus:border-accent focus:ring-4 focus:ring-accent/15 focus:outline-none aria-[invalid=true]:border-danger aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-danger/10 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted";

interface FieldProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  className?: string;
  children: (describedBy: string | undefined, invalid: boolean) => ReactNode;
}

export function Field({ id, label, hint, error, optional, className, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-medium text-ink">
        <span className="min-w-0 flex-1">{label}</span>
        {optional ? <span className="text-xs font-normal text-muted">Optional</span> : null}
      </label>
      {children(describedBy, Boolean(error))}
      {hint && !error ? (
        <p id={hintId} className="text-xs leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-xs font-medium text-danger">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-px size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l9.5 17h-19zM12 10v4M12 17h.01" />
          </svg>
          {error}
        </p>
      ) : null}
    </div>
  );
}

type Shared = Omit<FieldProps, "children">;

export function TextInput({
  id,
  label,
  hint,
  error,
  optional,
  className,
  ...props
}: Shared & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      {(describedBy, invalid) => (
        <input id={id} name={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={controlClass} {...props} />
      )}
    </Field>
  );
}

export function TextArea({
  id,
  label,
  hint,
  error,
  optional,
  className,
  ...props
}: Shared & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      {(describedBy, invalid) => (
        <textarea
          id={id}
          name={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(controlClass, "min-h-32 resize-y leading-relaxed")}
          {...props}
        />
      )}
    </Field>
  );
}

export function Select({
  id,
  label,
  hint,
  error,
  optional,
  className,
  children,
  ...props
}: Shared & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      {(describedBy, invalid) => (
        <div className="relative">
          <select
            id={id}
            name={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(controlClass, "appearance-none pe-10")}
            {...props}
          >
            {children}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="pointer-events-none absolute end-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      )}
    </Field>
  );
}

/** Number/amount input with a unit shown inside the field (e.g. the currency). */
export function AffixInput({
  id,
  label,
  hint,
  error,
  optional,
  className,
  suffix,
  ...props
}: Shared & InputHTMLAttributes<HTMLInputElement> & { suffix: string }) {
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional} className={className}>
      {(describedBy, invalid) => (
        <div className="relative">
          <input
            id={id}
            name={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(controlClass, "tabular pe-16")}
            {...props}
          />
          <span className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted">{suffix}</span>
        </div>
      )}
    </Field>
  );
}
