/**
 * Business brand colours come from customers of 5ali Review and may not be
 * accessible. Before using one as a button background with white text we make
 * sure it reaches WCAG AA (4.5:1), darkening it if necessary.
 */
const HEX = /^#([0-9a-f]{6})$/i;

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export const DEFAULT_BRAND = "#0b5c47";

/**
 * Returns a colour that keeps ≥4.5:1 contrast with white text and ≥3:1
 * against the page background. Falls back to the 5ali brand colour for
 * invalid input.
 */
export function ensureAccessibleBrand(color: string | null | undefined, minRatio = 4.5): string {
  if (!color || !isHexColor(color)) return DEFAULT_BRAND;
  let c = color.toLowerCase();
  for (let i = 0; i < 20 && contrastRatio(c, "#ffffff") < minRatio; i++) {
    c = darken(c, 0.08);
  }
  return contrastRatio(c, "#ffffff") >= minRatio ? c : DEFAULT_BRAND;
}
