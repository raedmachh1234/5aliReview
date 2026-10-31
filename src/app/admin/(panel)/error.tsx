"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-3xl border border-line bg-surface px-6 py-16 text-center">
      <Icon name="alert" size={30} className="mx-auto text-danger" />
      <h1 className="mt-4 text-lg font-semibold">This page couldn’t load</h1>
      <p className="mt-1 text-sm text-muted">The storage may be temporarily unavailable. Check the server logs for details.</p>
      <Button variant="secondary" className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
