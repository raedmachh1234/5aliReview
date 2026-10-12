"use client";

import { useId, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonVariant } from "@/components/ui/button";

/**
 * Destructive or important action behind a clear confirmation dialog.
 * Cancel and Confirm are equally visible; the dialog states the consequence
 * in plain words (no confirm-shaming, no hidden defaults).
 */
export function ConfirmAction({
  trigger,
  title,
  body,
  confirmLabel,
  cancelLabel,
  action,
  hidden,
  variant = "danger",
  triggerVariant = "danger",
}: {
  trigger: ReactNode;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  action: (formData: FormData) => void | Promise<void>;
  hidden?: Record<string, string>;
  variant?: ButtonVariant;
  triggerVariant?: ButtonVariant;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <Button variant={triggerVariant} size="sm" onClick={() => ref.current?.showModal()}>
        {trigger}
      </Button>
      <dialog ref={ref} aria-labelledby={titleId} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-6 text-ink shadow-2xl">
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <div className="mt-2 text-sm leading-relaxed text-ink-2">{body}</div>
        <form action={async (fd) => { await action(fd); ref.current?.close(); }} className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {Object.entries(hidden ?? {}).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <Button variant="secondary" onClick={() => ref.current?.close()}>
            {cancelLabel}
          </Button>
          <ConfirmSubmit variant={variant}>{confirmLabel}</ConfirmSubmit>
        </form>
      </dialog>
    </>
  );
}

function ConfirmSubmit({ children, variant }: { children: ReactNode; variant: ButtonVariant }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {children}
    </Button>
  );
}
