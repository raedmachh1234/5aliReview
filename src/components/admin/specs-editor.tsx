"use client";

import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import type { ProductSpec } from "@/lib/types";

const SUGGESTIONS = ["Material", "Size", "Dimensions", "Weight", "Colour", "Capacity", "Compatibility", "Warranty", "Includes", "Origin"];

/** Editable name/value rows, submitted as parallel `specLabel` / `specValue` fields. */
export function SpecsEditor({
  specs,
  onChange,
  max,
  error,
}: {
  specs: ProductSpec[];
  onChange: (specs: ProductSpec[]) => void;
  max: number;
  error?: string;
}) {
  const update = (index: number, patch: Partial<ProductSpec>) => onChange(specs.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  return (
    <div>
      <datalist id="spec-suggestions">
        {SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {specs.length > 0 ? (
        <ul className="space-y-2">
          {specs.map((spec, i) => (
            <li key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-center gap-2">
              <input
                name="specLabel"
                value={spec.label}
                onChange={(e) => update(i, { label: e.target.value })}
                list="spec-suggestions"
                placeholder="Name, e.g. Material"
                aria-label={`Specification ${i + 1} name`}
                className={controlClass}
              />
              <input
                name="specValue"
                value={spec.value}
                onChange={(e) => update(i, { value: e.target.value })}
                placeholder="Value, e.g. Acrylic"
                aria-label={`Specification ${i + 1} value`}
                className={controlClass}
              />
              <button
                type="button"
                onClick={() => onChange(specs.filter((_, j) => j !== i))}
                className="grid size-10 place-items-center rounded-xl text-muted transition hover:bg-danger-soft hover:text-danger"
              >
                <Icon name="trash" size={16} title={`Remove specification ${i + 1}`} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-surface-2/60 px-4 py-3 text-sm text-muted">
          Add details like size, material or what’s in the box. They appear as a table on the product page.
        </p>
      )}

      {error ? (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-xs font-medium text-danger">
          <Icon name="alert" size={14} className="mt-px shrink-0" />
          {error}
        </p>
      ) : null}

      <Button
        variant="secondary"
        size="sm"
        className="mt-4"
        disabled={specs.length >= max}
        onClick={() => onChange([...specs, { label: "", value: "" }])}
      >
        <Icon name="plus" size={16} />
        Add specification
      </Button>
    </div>
  );
}
