"use client";

import Image from "next/image";
import { useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export function Gallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const count = images.length;
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  if (count === 0) {
    return (
      <div className="grid aspect-square place-items-center rounded-2xl bg-surface-2 text-muted">
        <Icon name="image" size={40} />
      </div>
    );
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft") go(-1);
    if (event.key === "ArrowRight") go(1);
  };

  return (
    <div className="space-y-3">
      <div
        className="group relative aspect-square overflow-hidden rounded-2xl bg-surface-2"
        role={count > 1 ? "region" : undefined}
        aria-roledescription={count > 1 ? "carousel" : undefined}
        aria-label={count > 1 ? `${name} photos` : undefined}
        onKeyDown={count > 1 ? onKeyDown : undefined}
      >
        {images.map((src, i) => (
          <Image
            key={`${i}-${src}`}
            src={src}
            alt={count > 1 ? `${name} — photo ${i + 1} of ${count}` : name}
            fill
            preload={i === 0}
            sizes="(min-width: 1024px) 50vw, 100vw"
            // Whole photo, never cropped: product shots come in every shape.
            className={cn(
              "object-contain transition-[opacity,transform] duration-500 ease-out-soft",
              i === index ? "opacity-100" : "pointer-events-none scale-[1.02] opacity-0",
            )}
            aria-hidden={i !== index}
          />
        ))}
        {count > 1 ? (
          <>
            <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
              <button
                type="button"
                onClick={() => go(-1)}
                className="grid size-11 place-items-center rounded-full bg-surface/85 text-ink shadow-lg backdrop-blur transition hover:bg-surface"
              >
                <Icon name="chevronLeft" title="Previous photo" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="grid size-11 place-items-center rounded-full bg-surface/85 text-ink shadow-lg backdrop-blur transition hover:bg-surface"
              >
                <Icon name="chevronRight" title="Next photo" />
              </button>
            </div>
            <p className="absolute end-4 bottom-4 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-medium text-white tabular backdrop-blur" aria-live="polite">
              {index + 1} / {count}
            </p>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <ul className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <li key={`${i}-${src}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative block size-20 overflow-hidden rounded-xl bg-surface-2 ring-2 transition sm:size-24",
                  i === index ? "ring-accent" : "ring-transparent opacity-70 hover:opacity-100",
                )}
              >
                <Image src={src} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
