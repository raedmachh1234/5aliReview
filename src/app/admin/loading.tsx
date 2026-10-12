import { Skeleton } from "@/components/ui/surface";

/** Accessible loading state: announced once, visual skeleton hidden from screen readers. */
export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <Skeleton className="mb-6 h-9 w-64" />
      <Skeleton className="mb-6 h-16 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="mt-6 h-72 w-full" />
    </div>
  );
}
