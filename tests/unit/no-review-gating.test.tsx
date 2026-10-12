// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ThankYou } from "@/components/customer/thank-you";
import en from "@/i18n/dictionaries/en";

/**
 * NO REVIEW GATING — the most important product rule.
 * Every rating (1–5) must lead to exactly the same Google Review option.
 */

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 200)}` }),
  cookies: async () => ({ get: () => undefined }),
}));

const strings = { ...en.thanks };

afterEach(cleanup);

describe("Thank-you screen", () => {
  it("shows the Google Review button whenever a link is configured", () => {
    render(<ThankYou t={strings} googleHref="/r/cafe-el-bahia/google" hasGoogleReviewUrl />);
    const link = screen.getByTestId("google-review-button");
    expect(link.getAttribute("href")).toBe("/r/cafe-el-bahia/google");
    expect(link.textContent).toContain(en.thanks.googleButton);
  });

  it("explains honestly when no Google link exists (never hides it based on rating)", () => {
    render(<ThankYou t={strings} googleHref="/r/x/google" hasGoogleReviewUrl={false} />);
    expect(screen.queryByTestId("google-review-button")).toBeNull();
    expect(screen.getByTestId("google-unavailable").textContent).toBe(en.thanks.googleUnavailable);
  });

  it("does not accept a rating prop at all", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/customer/thank-you.tsx", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(src).not.toMatch(/\brating\b/);
  });
});

describe("submitFeedback server action", () => {
  beforeEach(async () => {
    const { resetDemoStore } = await import("@/server/data/demo");
    const { resetMemoryRateLimits } = await import("@/server/security/rate-limit");
    resetDemoStore();
    resetMemoryRateLimits();
  });

  it.each([1, 2, 3, 4, 5])("returns the identical success state for a %i-star rating", async (rating) => {
    const { submitFeedback } = await import("@/app/r/[slug]/actions");
    const fd = new FormData();
    fd.set("slug", "cafe-el-bahia");
    fd.set("source", "nfc");
    fd.set("rating", String(rating));
    const result = await submitFeedback({ status: "idle" }, fd);
    // Same object for every rating: the UI can't branch on it.
    expect(result).toEqual({ status: "success" });
  });

  it("asks for a rating instead of submitting an empty one", async () => {
    const { submitFeedback } = await import("@/app/r/[slug]/actions");
    const fd = new FormData();
    fd.set("slug", "cafe-el-bahia");
    fd.set("source", "nfc");
    expect(await submitFeedback({ status: "idle" }, fd)).toEqual({ status: "error", error: "ratingRequired" });
    fd.set("rating", "6");
    expect(await submitFeedback({ status: "idle" }, fd)).toEqual({ status: "error", error: "ratingRequired" });
  });

  it("stores only anonymous fields", async () => {
    const { submitFeedback } = await import("@/app/r/[slug]/actions");
    const { demoStore } = await import("@/server/data/demo");
    const fd = new FormData();
    fd.set("slug", "cafe-el-bahia");
    fd.set("source", "qr");
    fd.set("rating", "2");
    fd.set("name", "Should be ignored");
    fd.set("email", "ignored@example.com");
    await submitFeedback({ status: "idle" }, fd);
    const saved = demoStore().feedback[0];
    expect(Object.keys(saved).sort()).toEqual(["businessId", "cardId", "createdAt", "id", "locationId", "rating", "source"]);
    expect(JSON.stringify(saved)).not.toContain("ignored");
  });
});

describe("Google redirect route", () => {
  it("redirects to the stored Google link with no rating involved", async () => {
    const { GET } = await import("@/app/r/[slug]/google/route");
    const { NextRequest } = await import("next/server");
    const res = await GET(new NextRequest("http://localhost/r/cafe-el-bahia/google"), { params: Promise.resolve({ slug: "cafe-el-bahia" }) });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/^https:\/\/search\.google\.com\/local\/writereview/);
  });

  it("never redirects to a URL taken from the request (no open redirect)", async () => {
    const { GET } = await import("@/app/r/[slug]/google/route");
    const { NextRequest } = await import("next/server");
    const res = await GET(new NextRequest("http://localhost/r/atlas-gym/google?url=https://evil.example"), { params: Promise.resolve({ slug: "atlas-gym" }) });
    // Atlas Gym has no Google link configured → back to its own page, never to the injected URL.
    expect(res.headers.get("location")).toBe("http://localhost/r/atlas-gym");
  });
});
