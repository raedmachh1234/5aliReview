import { describe, expect, it } from "vitest";
import en from "@/i18n/dictionaries/en";
import fr from "@/i18n/dictionaries/fr";
import ar from "@/i18n/dictionaries/ar";
import { fmt, matchAcceptLanguage } from "@/i18n/config";
import { slugify } from "@/lib/slug";
import { feedbackSubmissionSchema, slugSchema } from "@/lib/validation";
import { resolveRange } from "@/lib/dates";
import { fillPlaceholders } from "@/server/legal";

function leaves(obj: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof obj === "string") out.set(prefix, obj);
  else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) for (const [kk, vv] of leaves(v, prefix ? `${prefix}.${k}` : k)) out.set(kk, vv);
  }
  return out;
}

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");

describe("translations", () => {
  const base = leaves(en);
  for (const [name, dict] of [["fr", fr], ["ar", ar]] as const) {
    const other = leaves(dict);
    it(`${name} has exactly the same keys as en`, () => {
      expect([...other.keys()].sort()).toEqual([...base.keys()].sort());
    });
    it(`${name} keeps every {placeholder}`, () => {
      const mismatched = [...base].filter(([k, v]) => placeholders(v) !== placeholders(other.get(k) ?? "")).map(([k]) => k);
      expect(mismatched).toEqual([]);
    });
    it(`${name} has no empty strings`, () => {
      expect([...other].filter(([, v]) => !v.trim()).map(([k]) => k)).toEqual([]);
    });
  }
  it("fmt fills placeholders", () => {
    expect(fmt("Rating: {n} out of 5 stars", { n: 4 })).toBe("Rating: 4 out of 5 stars");
  });
  it("matches Accept-Language", () => {
    expect(matchAcceptLanguage("ar-TN,ar;q=0.9,fr;q=0.8")).toBe("ar");
    expect(matchAcceptLanguage("de-DE,fr;q=0.5")).toBe("fr");
    expect(matchAcceptLanguage("de-DE")).toBeNull();
  });
});

describe("validation", () => {
  it("slugify produces valid, non-reserved slugs", () => {
    expect(slugify("Café El Bahia!")).toBe("cafe-el-bahia");
    expect(slugSchema.safeParse(slugify("Admin")).success).toBe(true);
    expect(slugSchema.safeParse(slugify("مقهى")).success).toBe(true);
  });
  it("feedback accepts only 1–5 and known sources", () => {
    const ok = feedbackSubmissionSchema.safeParse({ slug: "cafe-el-bahia", rating: "5", source: "nfc" });
    expect(ok.success).toBe(true);
    expect(feedbackSubmissionSchema.safeParse({ slug: "cafe-el-bahia", rating: "0", source: "nfc" }).success).toBe(false);
    const weird = feedbackSubmissionSchema.safeParse({ slug: "cafe-el-bahia", rating: "3", source: "<script>" });
    expect(weird.success && weird.data.source).toBe("link");
  });
});

describe("date ranges", () => {
  const now = new Date("2026-10-08T12:00:00Z");
  it("resolves presets", () => {
    expect(resolveRange("7d", undefined, undefined, now).days).toBe(7);
    expect(resolveRange("today", undefined, undefined, now).range.from).toBe("2026-10-08T00:00:00.000Z");
  });
  it("falls back to 30 days for bad custom input", () => {
    expect(resolveRange("custom", "2026-13-01", "nope", now).preset).toBe("30d");
    expect(resolveRange("custom", "2026-10-05", "2026-10-01", now).preset).toBe("30d");
  });
});

describe("legal placeholders", () => {
  it("fills known placeholders and leaves unknown ones visible", () => {
    const out = fillPlaceholders("Updated {{lastUpdated}} by {{company.tradeName}} {{company.nope}}", "2026-10-08");
    expect(out).toBe("Updated 2026-10-08 by 5ali Review {{company.nope}}");
  });
});
