"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={cn("size-4 animate-spin", className)} fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Submit button that shows a spinner while its form's action is running.
 * Forms that submit via onSubmit (not `action`) pass `pending` themselves.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
  disabled,
  pending: pendingProp,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={disabled || pending} aria-disabled={pending}>
      {pending ? <Spinner /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
