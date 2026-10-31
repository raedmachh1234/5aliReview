import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export default function NotFound() {
  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden px-4">
      <div aria-hidden="true" className="bg-grid absolute inset-0 -z-10" />
      <div className="max-w-md text-center">
        <p className="text-8xl font-semibold tracking-[-0.04em] text-accent-text">404</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">We couldn’t find that page</h1>
        <p className="mt-2 text-muted">The product may have been removed, or the link is mistyped.</p>
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink href="/products" variant="accent">
            Browse products
          </ButtonLink>
          <ButtonLink href="/" variant="secondary">
            <Icon name="home" size={16} />
            Home
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
