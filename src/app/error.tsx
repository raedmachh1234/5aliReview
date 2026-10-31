"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[70dvh] place-items-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-muted">Please try again. If it keeps happening, come back in a few minutes.</p>
        <Button variant="primary" className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
