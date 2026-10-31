"use client";

import Image from "next/image";
import { useRef, useState, type Dispatch, type DragEvent, type SetStateAction } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { uploadProductImage } from "@/server/actions/products";
import { Spinner } from "./submit-button";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

interface Pending {
  id: string;
  preview: string;
  name: string;
}

/**
 * Photo manager: files upload as soon as they're picked or dropped, then
 * appear in the grid where they can be reordered (first = cover) or removed.
 * The chosen URLs are submitted with the product as hidden `images` inputs.
 */
export function ImageManager({
  images,
  onChange,
  max,
  error,
}: {
  images: string[];
  onChange: Dispatch<SetStateAction<string[]>>;
  max: number;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const remaining = max - images.length - pending.length;

  async function upload(files: File[]) {
    setUploadErrors([]);
    const batch = files.slice(0, Math.max(0, remaining));
    if (files.length > batch.length) setUploadErrors([`You can add up to ${max} photos per product.`]);
    const items = batch.map((file) => ({ id: crypto.randomUUID(), preview: URL.createObjectURL(file), name: file.name }));
    setPending((p) => [...p, ...items]);

    for (const [i, file] of batch.entries()) {
      const formData = new FormData();
      formData.set("file", file);
      try {
        const result = await uploadProductImage(formData);
        if (result.ok) {
          onChange((current) => [...current, result.url]);
        } else {
          setUploadErrors((e) => [...e, result.error]);
        }
      } catch {
        setUploadErrors((e) => [...e, `Couldn’t upload ${file.name}. Check your connection and try again.`]);
      }
      URL.revokeObjectURL(items[i].preview);
      setPending((p) => p.filter((x) => x.id !== items[i].id));
    }
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    onChange((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (dragIndex !== null) return;
    const files = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) void upload(files);
  };

  return (
    <div>
      {images.map((url) => (
        <input key={url} type="hidden" name="images" value={url} />
      ))}

      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((url, i) => (
          <li
            key={url}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== i) {
                move(dragIndex, i);
                setDragIndex(i);
              }
            }}
            className={cn(
              "group relative aspect-square cursor-grab overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-line ring-inset active:cursor-grabbing",
              i === 0 && "col-span-2 row-span-2",
              dragIndex === i && "opacity-50",
            )}
          >
            <Image src={url} alt={`Photo ${i + 1}`} fill sizes="(min-width: 640px) 240px, 33vw" className="object-cover" />
            {i === 0 ? (
              <span className="absolute start-2.5 top-2.5 rounded-full bg-ink/80 px-2.5 py-1 text-[0.7rem] font-semibold text-white backdrop-blur">
                Cover
              </span>
            ) : null}
            <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1 opacity-100 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
              {i > 0 ? (
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  className="grid size-8 place-items-center rounded-full bg-surface/90 text-ink shadow backdrop-blur hover:bg-surface"
                >
                  <Icon name="chevronLeft" size={16} title={i === 1 ? "Make cover photo" : "Move earlier"} />
                </button>
              ) : null}
              {i < images.length - 1 ? (
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  className="grid size-8 place-items-center rounded-full bg-surface/90 text-ink shadow backdrop-blur hover:bg-surface"
                >
                  <Icon name="chevronRight" size={16} title="Move later" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onChange((current) => current.filter((_, j) => j !== i))}
                className="grid size-8 place-items-center rounded-full bg-surface/90 text-danger shadow backdrop-blur hover:bg-surface"
              >
                <Icon name="trash" size={15} title={`Remove photo ${i + 1}`} />
              </button>
            </div>
          </li>
        ))}

        {pending.map((item) => (
          <li key={item.id} className="relative aspect-square overflow-hidden rounded-2xl bg-surface-2">
            <Image src={item.preview} alt="" fill unoptimized className="object-cover opacity-50 blur-[1px]" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="flex items-center gap-2 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-medium shadow">
                <Spinner className="size-3.5" />
                Uploading
              </span>
            </span>
          </li>
        ))}

        {remaining > 0 ? (
          <li className={cn(images.length + pending.length === 0 ? "col-span-3 sm:col-span-4" : "aspect-square")}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragIndex === null) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                "flex size-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center transition",
                images.length + pending.length === 0 ? "py-12" : "p-2",
                dragging ? "border-accent bg-accent-soft text-accent-text" : "border-line-strong text-muted hover:border-ink/30 hover:bg-surface-2/60 hover:text-ink",
              )}
            >
              <span className="grid size-10 place-items-center rounded-full bg-surface-2">
                <Icon name="upload" size={18} />
              </span>
              <span className="text-sm font-medium">{images.length + pending.length === 0 ? "Drop photos here or click to upload" : "Add photos"}</span>
              {images.length + pending.length === 0 ? <span className="text-xs">JPG, PNG, WebP, AVIF or GIF · up to 8 MB each</span> : null}
            </button>
          </li>
        ) : null}
      </ul>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length > 0) void upload(files);
        }}
      />

      {[...uploadErrors, ...(error ? [error] : [])].map((message) => (
        <p key={message} role="alert" className="mt-3 flex items-start gap-1.5 text-xs font-medium text-danger">
          <Icon name="alert" size={14} className="mt-px shrink-0" />
          {message}
        </p>
      ))}
    </div>
  );
}
