import { beforeEach, describe, expect, it } from "vitest";
import { isAllowedGoogleReviewUrl } from "@/lib/google-review-url";
import { contrastRatio, ensureAccessibleBrand } from "@/lib/contrast";
import { createDemoSessionToken, verifyDemoSessionToken } from "@/server/auth/demo-session";
import { memoryRateLimit, resetMemoryRateLimits } from "@/server/security/rate-limit";
import { redact } from "@/server/security/logger";
import { isSameOrigin } from "@/server/security/request";

describe("Google review URL allowlist", () => {
  it.each([
    "https://g.page/r/CabcdEFG123/review",
    "https://search.google.com/local/writereview?placeid=ChIJ123",
    "https://maps.app.goo.gl/abc123",
    "https://www.google.com/maps/place/x",
  ])("accepts %s", (url) => expect(isAllowedGoogleReviewUrl(url)).toBe(true));

  it.each([
    "http://g.page/r/abc/review",
    "https://evil.com/?q=g.page",
    "https://g.page.evil.com/r/x",
    "https://www.google.com/url?q=https://evil.com",
    "https://user:pass@g.page/r/x",
    "javascript:alert(1)",
    "",
  ])("rejects %s", (url) => expect(isAllowedGoogleReviewUrl(url)).toBe(false));
});

describe("brand colour contrast", () => {
  it("darkens light brand colours until white text reaches 4.5:1", () => {
    const c = ensureAccessibleBrand("#f59e0b");
    expect(contrastRatio(c, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
  it("keeps already-accessible colours", () => {
    expect(ensureAccessibleBrand("#0b5c47")).toBe("#0b5c47");
  });
  it("falls back for invalid input (no CSS injection)", () => {
    expect(ensureAccessibleBrand("red; background:url(x)")).toBe("#0b5c47");
  });
});

describe("demo session tokens", () => {
  it("round-trips a valid token", () => {
    expect(verifyDemoSessionToken(createDemoSessionToken("user-1"))).toBe("user-1");
  });
  it("rejects tampered tokens", () => {
    const [data, sig] = createDemoSessionToken("user-1").split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "admin", exp: 9_999_999_999 })).toString("base64url");
    expect(verifyDemoSessionToken(`${forged}.${sig}`)).toBeNull();
    expect(verifyDemoSessionToken(`${data}.x${sig.slice(1)}`)).toBeNull();
  });
  it("rejects expired tokens", () => {
    const token = createDemoSessionToken("user-1", Date.now() - 9 * 3600_000);
    expect(verifyDemoSessionToken(token)).toBeNull();
  });
});

describe("rate limiter", () => {
  beforeEach(resetMemoryRateLimits);
  it("allows up to the limit, then blocks within the window", () => {
    const rule = { max: 3, windowSeconds: 60 };
    const now = 1_000_000;
    expect([1, 2, 3, 4].map(() => memoryRateLimit("k", rule, now))).toEqual([true, true, true, false]);
    expect(memoryRateLimit("k", rule, now + 61_000)).toBe(true);
  });
});

describe("logger redaction", () => {
  it("drops secrets and masks emails", () => {
    const out = redact({ password: "hunter2", note: "contact a@b.co", nested: { apiKey: "x" } }) as Record<string, unknown>;
    expect(out.password).toBe("[redacted]");
    expect(out.note).toBe("contact [email]");
    expect((out.nested as Record<string, unknown>).apiKey).toBe("[redacted]");
  });
});

describe("CSRF origin check", () => {
  const req = (origin: string | null) =>
    new Request("https://5ali.tn/api/x", { method: "POST", headers: { host: "5ali.tn", ...(origin ? { origin } : {}) } });
  it("accepts same-origin", () => expect(isSameOrigin(req("https://5ali.tn"))).toBe(true));
  it("rejects cross-origin and missing origin", () => {
    expect(isSameOrigin(req("https://evil.com"))).toBe(false);
    expect(isSameOrigin(req(null))).toBe(false);
  });
});
