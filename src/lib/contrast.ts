/**
 * The accent colour is chosen by the store owner, so text placed on it is
 * picked for contrast (WCAG relative luminance) instead of assumed.
 */
const HEX = /^#([0-9a-f]{6})$/i;

/** Sidi Bou Said blue. */
export const DEFAULT_ACCENT = "#1662b0";

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

/** Text colour (near-white or near-black) that reads best on `background`. */
export function readableTextOn(background: string): string {
  const color = isHexColor(background) ? background : DEFAULT_ACCENT;
  return contrastRatio(color, "#ffffff") >= contrastRatio(color, "#0b0b0c") ? "#ffffff" : "#0b0b0c";
}
