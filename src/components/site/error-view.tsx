"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary UI. Never shows the error message or stack (they may
 * contain internals); only the opaque digest, which support can match in logs.
 * Strings come from the <html lang> so this works without server data.
 */
const TEXT = {
  en: { title: "Something went wrong", body: "An unexpected error occurred. Please try again.", retry: "Try again", home: "Go to the home page", ref: "Reference" },
  fr: { title: "Une erreur est survenue", body: "Une erreur inattendue s’est produite. Veuillez réessayer.", retry: "Réessayer", home: "Aller à l’accueil", ref: "Référence" },
  ar: { title: "حدث خطأ ما", body: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.", retry: "إعادة المحاولة", home: "العودة إلى الصفحة الرئيسية", ref: "المرجع" },
} as const;

export function ErrorView({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Page language from <html lang>; "en" during server render (no hydration mismatch).
  const lang = useSyncExternalStore(
    () => () => {},
    () => document.documentElement.lang,
    () => "en",
  );
  useEffect(() => {
    // Logged in the browser console only; details stay on the server.
    console.error("ui_error", error.digest ?? "");
  }, [error]);
  const t = TEXT[lang as keyof typeof TEXT] ?? TEXT.en;
  return (
    <div role="alert" className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">{t.title}</h1>
      <p className="mt-2 text-ink-2">{t.body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>{t.retry}</Button>
        <Link href="/" className="inline-flex min-h-11 items-center px-4 font-semibold text-ink-2 underline underline-offset-4">
          {t.home}
        </Link>
      </div>
      {error.digest ? (
        <p className="mt-6 font-mono text-xs text-muted">
          {t.ref}: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
