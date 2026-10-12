import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Customer NFC flow — the heart of the product. Must work for EVERY rating, on small phones, by keyboard and without JS. */

for (const rating of [1, 2, 3, 4, 5]) {
  test(`NFC tap → ${rating}★ → thank you → the same Google Review option`, async ({ page }) => {
    await page.goto("/t/CAFEMRS2");
    await expect(page).toHaveURL(/\/r\/cafe-el-bahia\?loc=la-marsa&card=CAFEMRS2&src=nfc/);
    await expect(page.getByRole("heading", { level: 1, name: "How was your experience?" })).toBeVisible();

    await page.getByLabel(`Rating: ${rating} out of 5 stars`).check();
    await page.getByRole("button", { name: "Submit feedback" }).click();

    const heading = page.getByRole("heading", { name: "Thank you for your feedback!" });
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();
    const google = page.getByTestId("google-review-button");
    await expect(google).toBeVisible();
    await expect(google).toHaveAttribute("href", "/r/cafe-el-bahia/google?loc=la-marsa&card=CAFEMRS2");

    await expect(google).toHaveAttribute("target", "_blank");
    await expect(google).toHaveAttribute("rel", /noopener/);
    // Following the button: one anonymous click is counted, then a redirect to the stored Google
    // link. Checked on the response so the test never contacts Google.
    const res = await page.request.get("/r/cafe-el-bahia/google?loc=la-marsa&card=CAFEMRS2", { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toMatch(/^https:\/\/search\.google\.com\/local\/writereview\?placeid=/);
  });
}

test("keyboard only: Tab into the stars, arrows to change, Enter to submit", async ({ page }) => {
  await page.goto("/r/cafe-el-bahia");
  const first = page.getByLabel("Rating: 1 out of 5 stars");
  await first.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Rating: 3 out of 5 stars")).toBeChecked();
  await expect(page.getByText("3 out of 5 — Okay")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Submit feedback" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Thank you for your feedback!" })).toBeFocused();
});

test("submitting without a rating shows an accessible error", async ({ page }) => {
  await page.goto("/r/cafe-el-bahia");
  await page.getByRole("button", { name: "Submit feedback" }).click();
  const error = page.locator("#rating-error");
  await expect(error).toHaveText("Please select a rating before continuing.");
  await expect(error).toHaveAttribute("role", "alert");
  await expect(page.getByLabel("Rating: 1 out of 5 stars")).toBeFocused();
});

test("works without JavaScript (progressive enhancement)", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/r/cafe-el-bahia");
  await page.getByLabel("Rating: 2 out of 5 stars").check();
  await page.getByRole("button", { name: "Submit feedback" }).click();
  await expect(page.getByRole("heading", { name: "Thank you for your feedback!" })).toBeVisible();
  await expect(page.getByTestId("google-review-button")).toBeVisible();
  await context.close();
});

test("follows the phone language: a French browser gets French", async ({ browser }) => {
  const context = await browser.newContext({ locale: "fr-FR" });
  const page = await context.newPage();
  await page.goto("/r/cafe-el-bahia");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Comment s'est passée votre visite ?");
  await context.close();
});

test("customer page sets no cookies and is not indexable", async ({ page, context }) => {
  const res = await page.goto("/r/cafe-el-bahia");
  expect(res?.headers()["x-robots-tag"]).toContain("noindex");
  expect(res?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(await context.cookies()).toEqual([]);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("business without a Google link says so honestly", async ({ page }) => {
  await page.goto("/r/atlas-gym?lang=en");
  await page.getByLabel("Rating: 5 out of 5 stars").check();
  await page.getByRole("button", { name: "Submit feedback" }).click();
  await expect(page.getByTestId("google-unavailable")).toHaveText("Google reviews are currently unavailable.");
});

test("inactive card and unknown business show the unavailable page", async ({ page }) => {
  await page.goto("/t/CAFETBL3");
  await expect(page.getByRole("heading", { name: "This business page is no longer available." })).toBeVisible();
  const res = await page.goto("/r/does-not-exist");
  expect(res?.status()).toBe(404);
});

for (const width of [320, 375, 390, 430]) {
  test(`fits a ${width}px phone: rating and submit on the first screen, no horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 640 });
    await page.goto("/r/cafe-el-bahia");
    const submit = page.getByRole("button", { name: "Submit feedback" });
    const box = await submit.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(640);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

for (const lang of ["en", "fr", "ar"] as const) {
  test(`customer page has no accessibility violations (${lang})`, async ({ page }) => {
    await page.goto(`/r/cafe-el-bahia?lang=${lang}`);
    if (lang === "ar") await expect(page.locator("[dir=rtl]").first()).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
}
