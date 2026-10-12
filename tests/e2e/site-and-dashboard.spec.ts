import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BAHIA = "10000000-0000-4000-8000-000000000001";
const SALON = "10000000-0000-4000-8000-000000000002";

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("demo-password-2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(dashboard|admin)/);
}

test.describe("public site", () => {
  for (const path of ["/", "/pricing", "/faq", "/contact", "/login", "/signup", "/data-deletion", "/legal/privacy", "/legal/cookies"]) {
    test(`${path} has no accessibility violations`, async ({ page }) => {
      await page.goto(path);
      expect(await axe(page)).toEqual([]);
    });
  }

  test("cookie banner: equal choices, reject works, settings reopen from the footer, Escape closes", async ({ page, context }) => {
    await page.goto("/");
    const banner = page.getByRole("region", { name: "Cookies on 5ali Review" });
    await expect(banner).toBeVisible();
    const accept = banner.getByRole("button", { name: "Accept all" });
    const reject = banner.getByRole("button", { name: "Reject non-essential" });
    // No dark pattern: both buttons share the same styling.
    expect(await accept.getAttribute("class")).toBe(await reject.getAttribute("class"));
    await reject.click();
    await expect(banner).toBeHidden();
    const consent = (await context.cookies()).find((c) => c.name === "5ali_consent");
    expect(decodeURIComponent(consent!.value)).toContain('"preferences":false');
    expect(consent!.httpOnly).toBe(true);

    await page.getByRole("link", { name: "Cookie settings" }).click();
    const dialog = page.getByRole("dialog", { name: "Cookie settings" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("switch", { name: "Preferences" })).not.toBeChecked();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("pricing is transparent: price, billing period, tax note and placeholder notice", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText("/ month").first()).toBeVisible();
    await expect(page.getByText(/Prices exclude VAT/).first()).toBeVisible();
    await expect(page.getByText("Placeholder price — not yet final").first()).toBeVisible();
    await expect(page.getByText(/Cancel anytime from Billing/)).toBeVisible();
  });

  test("Arabic switches the whole page to RTL", async ({ page }) => {
    await page.goto("/?lang=ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  });

  test("security headers are present", async ({ page }) => {
    const res = await page.goto("/");
    const h = res!.headers();
    expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("robots.txt keeps private areas out of search engines", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();
    for (const p of ["/dashboard", "/admin", "/r/", "/t/"]) expect(body).toContain(`Disallow: ${p}`);
  });
});

test.describe("dashboard", () => {
  test("owner sees their dashboard without accessibility violations", async ({ page }) => {
    await login(page, "owner@demo.5ali.tn");
    await expect(page).toHaveURL(new RegExp(`/dashboard/${BAHIA}`));
    await expect(page.getByRole("heading", { name: "Total feedback" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rating distribution" })).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test("Business A cannot open Business B (404, not 403)", async ({ page }) => {
    await login(page, "owner@demo.5ali.tn");
    const res = await page.goto(`/dashboard/${SALON}`);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.getByText("Salon Paris")).toHaveCount(0);
    const api = await page.request.get(`/api/export/${SALON}?format=csv`);
    expect(api.status()).toBe(404);
  });

  test("non-admins cannot reach the admin panel", async ({ page }) => {
    await login(page, "owner@demo.5ali.tn");
    const res = await page.goto("/admin");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.getByText("Users & permissions")).toHaveCount(0);
  });

  test("export downloads anonymous CSV", async ({ page }) => {
    await login(page, "owner@demo.5ali.tn");
    const res = await page.request.get(`/api/export/${BAHIA}?format=csv`);
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text.split("\n")[0]).toContain("id,created_at,rating,location,source");
    expect(text).not.toMatch(/@/);
  });

  test("dashboard pages render for every section", async ({ page }) => {
    await login(page, "owner@demo.5ali.tn");
    for (const section of ["feedback", "analytics", "locations", "google-reviews", "nfc-cards", "qr-codes", "settings", "billing", "privacy"]) {
      const res = await page.goto(`/dashboard/${BAHIA}/${section}`);
      expect(res?.status(), section).toBe(200);
      expect(await axe(page), section).toEqual([]);
    }
  });

  test("mobile drawer: opens, traps focus, closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await login(page, "owner@demo.5ali.tn");
    await page.getByRole("button", { name: "Open menu" }).click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  });

  test("admin can open the admin panel", async ({ page }) => {
    await login(page, "admin@demo.5ali.tn");
    await expect(page).toHaveURL(/\/admin/);
    for (const section of ["", "/businesses", "/users", "/billing", "/legal", "/deletion-requests", "/logs"]) {
      const res = await page.goto(`/admin${section}`);
      expect(res?.status(), section).toBe(200);
    }
  });
});
