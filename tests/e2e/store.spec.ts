import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "e2e-admin-password";

// 1×1 transparent PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/admin");
}

test("storefront lists published sample products and hides drafts", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("your business");
  await expect(page.getByRole("heading", { name: "Featured products" })).toBeVisible();

  await page.goto("/products");
  await expect(page.getByRole("link", { name: /NFC Review Card/ }).first()).toBeVisible();
  await expect(page.getByText("Wall Display Plaque")).toHaveCount(0);

  const draft = await page.goto("/products/wall-display-plaque");
  expect(draft?.status()).toBe(404);
});

test("the logo splash covers the store on load, then gets out of the way", async ({ page }) => {
  await page.goto("/");
  const splash = page.locator(".splash");
  await expect(splash).toBeAttached();
  // About 4 s of animation, then it's removed.
  await expect(splash).toHaveCount(0, { timeout: 8000 });
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Products" }).click();
  await expect(page).toHaveURL("/products");
  await expect(splash).toHaveCount(0);
});

test("catalogue search and category filters", async ({ page }) => {
  await page.goto("/products?category=Stickers");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Stickers");
  await expect(page.getByRole("listitem").filter({ has: page.getByRole("link", { name: /QR Sticker Pack/ }) })).toHaveCount(1);

  await page.goto("/products?q=keychain");
  await expect(page.getByText("1 product")).toBeVisible();
});

test("admin is protected and rejects a wrong password", async ({ page }) => {
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fproducts/);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That password isn’t right.")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("owner creates, edits, unpublishes and deletes a product", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Add product" }).first().click();
  await expect(page).toHaveURL("/admin/products/new");

  // Validation keeps what was typed.
  await page.getByLabel("Product name").fill("E2E Gift Box");
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page.getByText("Enter a price.")).toBeVisible();
  await expect(page.getByLabel("Product name")).toHaveValue("E2E Gift Box");

  await page.getByLabel("Price", { exact: true }).fill("120");
  await page.getByLabel("Compare-at price").fill("150");
  await expect(page.getByText("20% discount")).toBeVisible();
  await page.getByLabel("Short description").fill("A test box");
  await page.getByLabel("Category").fill("Gifts");
  await page.locator("input[type=file]").setInputFiles({ name: "box.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByAltText("Photo 1")).toBeVisible();
  await page.getByRole("button", { name: "Add specification" }).click();
  await page.getByLabel("Specification 1 name").fill("Size");
  await page.getByLabel("Specification 1 value").fill("20 cm");
  await page.getByLabel(/Search title/).fill("Coffret cadeau NFC | E2E");

  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}\?created=1$/);
  await expect(page.getByText("Product created.")).toBeVisible();

  // Visible in the store with its discount and specs.
  await page.goto("/products/e2e-gift-box");
  await expect(page).toHaveTitle("Coffret cadeau NFC | E2E");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("E2E Gift Box");
  await expect(page.getByText("Save 20%")).toBeVisible();
  await expect(page.getByText("20 cm")).toBeVisible();
  const photo = page.getByRole("img", { name: "E2E Gift Box" });
  await expect(photo).toBeVisible();
  expect(await photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

  // Edit the price.
  await page.goBack();
  await page.getByLabel("Price", { exact: true }).fill("99");
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved.")).toBeVisible();
  await expect(page.getByText("All changes saved")).toBeVisible();
  await page.goto("/products/e2e-gift-box");
  await expect(page.getByText("TND 99").first()).toBeVisible();

  // Unpublish from the product list.
  await page.goto("/admin/products");
  const row = page.getByRole("row", { name: /E2E Gift Box/ });
  await row.getByRole("switch").click();
  await expect(row.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  await expect.poll(async () => (await page.request.get("/products/e2e-gift-box")).status()).toBe(404);

  // Delete it.
  await row.getByRole("button", { name: "Delete E2E Gift Box" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete product" }).click();
  await expect(page.getByText("Product deleted.")).toBeVisible();
  await expect(page.getByRole("row", { name: /E2E Gift Box/ })).toHaveCount(0);
});

test("search engines get a sitemap, robots.txt, canonical URLs and structured data", async ({ page, request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toContain("Sitemap: http://localhost:3100/sitemap.xml");

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("<loc>http://localhost:3100/products/nfc-review-card</loc>");
  expect(sitemap).toContain("<image:loc>http://localhost:3100/samples/nfc-review-card.svg</image:loc>");
  expect(sitemap).not.toContain("wall-display-plaque");

  await page.goto("/products/nfc-review-card");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "http://localhost:3100/products/nfc-review-card");
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(ld ?? "[]")[0]).toMatchObject({ "@type": "Product", offers: { price: 35, priceCurrency: "TND" } });

  await page.goto("/products?q=card");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  const admin = await request.get("/admin/login");
  expect(admin.headers()["x-robots-tag"]).toContain("noindex");
});

test("settings change the storefront", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/settings");
  await page.getByLabel("Google verification code").fill('<meta name="google-site-verification" content="e2e-verify_123" />');
  await page.getByLabel("Store name").fill("Test Shop");
  await page.getByLabel("WhatsApp number").fill("+216 20 123 456");
  await page.getByLabel("Announcement bar").fill("Grand opening this week");
  await page.getByLabel(/^Phone/).fill("+216 71 000 000");
  await page.getByLabel("Type of business").selectOption("ElectronicsStore");
  await page.getByLabel("Street address").fill("12 Rue de Marseille");
  await page.getByLabel("Postal code").fill("1000");
  await page.getByLabel(/^City/).fill("Tunis");
  await page.locator('label:has(input[name="open_Mo"])').click();
  await page.getByLabel("Monday closing time").fill("17:30");
  await page.getByLabel("Google Maps link").fill("https://maps.app.goo.gl/e2eTest");
  await page.getByLabel("Homepage search title").fill("Cartes NFC avis Google en Tunisie | Test Shop");
  await expect(page.getByText(/keywords appear in your store/)).toBeVisible();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();

  await page.goto("/");
  await expect(page).toHaveTitle("Cartes NFC avis Google en Tunisie | Test Shop");
  const business = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "[]")[1];
  expect(business).toMatchObject({
    "@type": "ElectronicsStore",
    name: "Test Shop",
    telephone: "+216 71 000 000",
    address: { streetAddress: "12 Rue de Marseille", postalCode: "1000", addressLocality: "Tunis", addressCountry: "TN" },
    hasMap: "https://maps.app.goo.gl/e2eTest",
    openingHoursSpecification: [{ dayOfWeek: "https://schema.org/Monday", opens: "09:00", closes: "17:30" }],
  });
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByText("1000 Tunis")).toBeVisible();
  await expect(footer.getByText("09:00–17:30")).toBeVisible();
  await expect(footer.getByRole("link", { name: /Get directions/ })).toHaveAttribute("href", "https://maps.app.goo.gl/e2eTest");

  await page.goto("/products/nfc-review-card");
  await expect(page.getByText("Grand opening this week")).toBeVisible();
  const order = page.getByRole("link", { name: "Order on WhatsApp" });
  await expect(order).toHaveAttribute("href", /^https:\/\/wa\.me\/21620123456\?text=/);
  await expect(page).toHaveTitle(/Test Shop/);
  await expect(page.locator('meta[name="google-site-verification"]')).toHaveAttribute("content", "e2e-verify_123");
});
