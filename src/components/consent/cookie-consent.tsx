"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveConsent } from "@/server/consent";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export const OPEN_COOKIE_SETTINGS_EVENT = "5ali:open-cookie-settings";

type Category = "essential" | "preferences" | "analytics" | "marketing";

export interface CookieConsentStrings {
  bannerTitle: string;
  bannerBody: string;
  acceptAll: string;
  rejectNonEssential: string;
  settings: string;
  dialogTitle: string;
  dialogIntro: string;
  save: string;
  alwaysOn: string;
  notUsed: string;
  policyLink: string;
  close: string;
  categories: Record<Category, { title: string; body: string }>;
}

/**
 * Cookie banner + settings dialog.
 * - No dark patterns: Accept and Reject have identical styling and weight,
 *   nothing is pre-ticked, and closing the banner is not treated as consent.
 * - The banner doesn't block the page; the dialog is a native <dialog>
 *   (focus is trapped by the browser, Escape closes it, focus returns).
 */
export function CookieConsent({
  t,
  initial,
  inUse,
}: {
  t: CookieConsentStrings;
  /** Current choice, or null if the visitor hasn't chosen yet. */
  initial: { preferences: boolean } | null;
  inUse: Record<Category, boolean>;
}) {
  const [choice, setChoice] = useState(initial);
  const [draftPreferences, setDraftPreferences] = useState(initial?.preferences ?? false);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const open = () => {
      opener.current = document.activeElement as HTMLElement | null;
      setDraftPreferences(choice?.preferences ?? false);
      dialogRef.current?.showModal();
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
  }, [choice]);

  const commit = (preferences: boolean) =>
    startTransition(async () => {
      const saved = await saveConsent({ preferences });
      setChoice({ preferences: saved.preferences });
      dialogRef.current?.close();
    });

  const categories: Category[] = ["essential", "preferences", "analytics", "marketing"];

  return (
    <>
      {choice === null ? (
        <section
          aria-labelledby="cookie-banner-title"
          className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl rounded-2xl border border-line bg-surface p-5 shadow-[0_12px_40px_-12px_rgb(16_24_40/0.35)] sm:inset-x-6 sm:bottom-6"
        >
          <h2 id="cookie-banner-title" className="flex items-center gap-2 text-base font-bold text-ink">
            <Icon name="shield" size={18} className="text-pine" />
            {t.bannerTitle}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
            {t.bannerBody}{" "}
            <Link href="/legal/cookies" className="font-semibold text-ink underline underline-offset-4">
              {t.policyLink}
            </Link>
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Button variant="secondary" disabled={pending} onClick={() => commit(true)}>
              {t.acceptAll}
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => commit(false)}>
              {t.rejectNonEssential}
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              className="underline underline-offset-4"
              onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))}
            >
              {t.settings}
            </Button>
          </div>
        </section>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-labelledby="cookie-dialog-title"
        onClose={() => opener.current?.focus()}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl"
      >
        <form
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault();
            commit(draftPreferences);
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id="cookie-dialog-title" className="text-lg font-bold">
                {t.dialogTitle}
              </h2>
              <p className="mt-1 text-sm text-muted">{t.dialogIntro}</p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="grid size-10 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-subtle"
            >
              <Icon name="x" title={t.close} />
            </button>
          </div>
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto px-5">
            {categories.map((c) => {
              const id = `cookie-cat-${c}`;
              const required = c === "essential";
              const used = inUse[c];
              return (
                <li key={c} className="flex items-start justify-between gap-4 py-4">
                  <div>
                    <label htmlFor={id} className="font-semibold text-ink">
                      {t.categories[c].title}
                    </label>
                    <p id={`${id}-desc`} className="mt-0.5 text-sm text-muted">
                      {t.categories[c].body}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <input
                      id={id}
                      type="checkbox"
                      role="switch"
                      aria-describedby={`${id}-desc`}
                      checked={required || (c === "preferences" && draftPreferences)}
                      disabled={required || !used}
                      onChange={(e) => c === "preferences" && setDraftPreferences(e.target.checked)}
                      className="size-6 accent-pine disabled:opacity-70"
                    />
                    <span className="text-xs font-medium text-muted">{required ? t.alwaysOn : !used ? t.notUsed : null}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
            <Button variant="secondary" disabled={pending} onClick={() => commit(false)}>
              {t.rejectNonEssential}
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {t.save}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Footer link that reopens the settings. Without JS it goes to the Cookie Policy, which has a plain form. */
export function CookieSettingsLink({ label, className }: { label: string; className?: string }) {
  return (
    <Link
      href="/legal/cookies#manage"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
      }}
    >
      {label}
    </Link>
  );
}
