"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

/**
 * Modal confirmation built on <dialog> (focus trapping, Esc to close and the
 * backdrop come from the browser). `children` holds the form that confirms.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="confirm-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-line bg-surface p-0 text-ink shadow-2xl open:animate-toast"
    >
      <div className="p-6">
        <span className="grid size-11 place-items-center rounded-full bg-danger-soft text-danger">
          <Icon name="trash" size={20} />
        </span>
        <h2 id="confirm-title" className="mt-4 text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <div className="mt-1.5 text-sm leading-relaxed text-muted">{description}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>
      </div>
    </dialog>
  );
}
