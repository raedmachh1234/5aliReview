"use client";

import { startTransition, useActionState, useEffect, useState, type CSSProperties } from "react";
import { BrandMark } from "@/components/store/brand";
import { Field, Select, TextArea, TextInput, controlClass } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { BUSINESS_TYPES, homeSearchDescription, homeSearchTitle, normaliseForSearch, splitKeywords } from "@/lib/business";
import { cn } from "@/lib/cn";
import { isHexColor, readableTextOn } from "@/lib/contrast";
import { splitHighlight } from "@/lib/format";
import { idleState, type StoreSettings } from "@/lib/types";
import { LIMITS } from "@/lib/validation";
import { saveSettings } from "@/server/actions/settings";
import { CopyField } from "./copy-field";
import { HoursEditor } from "./hours-editor";
import { Card } from "./page-header";
import { CharCount, SearchPreview } from "./search-preview";
import { SubmitButton } from "./submit-button";
import { Toast } from "./toast";

const CURRENCIES = [
  ["TND", "Tunisian dinar"],
  ["EUR", "Euro"],
  ["USD", "US dollar"],
  ["GBP", "British pound"],
  ["MAD", "Moroccan dirham"],
  ["DZD", "Algerian dinar"],
  ["LYD", "Libyan dinar"],
  ["EGP", "Egyptian pound"],
  ["SAR", "Saudi riyal"],
  ["AED", "UAE dirham"],
  ["QAR", "Qatari riyal"],
  ["CAD", "Canadian dollar"],
] as const;

const SWATCHES = ["#1662b0", "#dc2626", "#4f46e5", "#7c3aed", "#db2777", "#e11d48", "#ea580c", "#ca8a04", "#16a34a", "#0d9488", "#0284c7", "#0b0b0c"];

export function SettingsForm({
  settings,
  seo,
  catalogText,
}: {
  settings: StoreSettings;
  /** Site URL facts for the search cards. */
  seo: { siteUrl: string; siteUrlConfigured: boolean; envVerification: boolean };
  /** All published product text, for the keyword check. */
  catalogText: string;
}) {
  const [state, action, saving] = useActionState(saveSettings, idleState);
  const [accent, setAccent] = useState(settings.accentColor);
  const [storeName, setStoreName] = useState(settings.storeName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [heroTitle, setHeroTitle] = useState(settings.heroTitle);
  const [heroSubtitle, setHeroSubtitle] = useState(settings.heroSubtitle);
  const [seoTitle, setSeoTitle] = useState(settings.seoTitle);
  const [seoDescription, setSeoDescription] = useState(settings.seoDescription);
  const [keywords, setKeywords] = useState(settings.seoKeywords);
  const [businessType, setBusinessType] = useState(settings.businessType);

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const validAccent = isHexColor(accent) ? accent : settings.accentColor;
  const currencies = CURRENCIES.some(([code]) => code === settings.currency)
    ? CURRENCIES
    : ([[settings.currency, settings.currency], ...CURRENCIES] as const);

  const searchTitle = homeSearchTitle({ seoTitle, storeName, tagline });
  const searchDescription = homeSearchDescription({ seoDescription, heroSubtitle, tagline });

  useEffect(() => {
    if (state.status === "error") document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [state]);

  return (
    <form
      noValidate
      className="pb-10"
      onSubmit={(event) => {
        // onSubmit instead of <form action> so React doesn't reset the fields after saving.
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => action(formData));
      }}
    >
      {state.status === "error" ? (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          <Icon name="alert" size={18} className="mt-px shrink-0" />
          <p className="font-medium">{state.message}</p>
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card title="Store identity">
            <div className="space-y-5">
              <TextInput
                id="storeName"
                label="Store name"
                hint="Use exactly the same name as on your Google Business Profile."
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                maxLength={60}
                error={errors.storeName}
                required
              />
              <TextInput
                id="tagline"
                label="Tagline"
                hint="Shown in the footer, and used in Google when you leave the search title empty."
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={120}
                error={errors.tagline}
                optional
              />
              <Select id="currency" label="Currency" defaultValue={settings.currency} error={errors.currency}>
                {currencies.map(([code, name]) => (
                  <option key={code} value={code}>
                    {code} — {name}
                  </option>
                ))}
              </Select>
              <fieldset>
                <legend className="text-sm font-medium">Brand colour</legend>
                <p className="mt-1 text-xs text-muted">Used for buttons, highlights and badges across the store.</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAccent(color)}
                      aria-label={`Use colour ${color}`}
                      aria-pressed={accent.toLowerCase() === color}
                      className={cn(
                        "grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-surface transition hover:scale-110",
                        accent.toLowerCase() === color && "ring-2 ring-ink",
                      )}
                      style={{ background: color, color: readableTextOn(color) }}
                    >
                      {accent.toLowerCase() === color ? <Icon name="check" size={16} /> : null}
                    </button>
                  ))}
                  <label className="relative grid size-9 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-line-strong text-muted transition hover:text-ink">
                    <Icon name="plus" size={16} title="Pick a custom colour" />
                    <input
                      type="color"
                      value={validAccent}
                      onChange={(e) => setAccent(e.target.value)}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                  <input
                    name="accentColor"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value.trim())}
                    aria-label="Brand colour hex code"
                    aria-invalid={errors.accentColor ? true : undefined}
                    className="h-9 w-28 rounded-full border border-line-strong bg-surface px-3.5 font-mono text-xs text-ink uppercase focus:border-accent focus:ring-4 focus:ring-accent/15 focus:outline-none aria-[invalid=true]:border-danger"
                  />
                </div>
                {errors.accentColor ? <p className="mt-2 text-xs font-medium text-danger">{errors.accentColor}</p> : null}
              </fieldset>
            </div>
          </Card>

          <Card title="Homepage">
            <div className="space-y-5">
              <TextInput
                id="heroTitle"
                label="Headline"
                hint="Wrap a word in *asterisks* to highlight it, e.g. Tap. Scan. *Grow*."
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                maxLength={120}
                error={errors.heroTitle}
                optional
              />
              <TextArea
                id="heroSubtitle"
                label="Intro text"
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                maxLength={280}
                rows={3}
                error={errors.heroSubtitle}
                optional
              />
              <TextInput
                id="announcement"
                label="Announcement bar"
                hint="A short message above the header, e.g. a promotion. Leave empty to hide it."
                defaultValue={settings.announcement}
                maxLength={140}
                error={errors.announcement}
                optional
              />
            </div>
          </Card>

          <Card title="Contact & ordering" description="Customers order through these. Only filled-in methods are shown in the store.">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextInput
                id="whatsapp"
                label="WhatsApp number"
                hint="With country code, e.g. +216 20 123 456."
                type="tel"
                defaultValue={settings.whatsapp}
                error={errors.whatsapp}
                optional
              />
              <TextInput
                id="phone"
                label="Phone"
                hint="Same number as on your Business Profile."
                type="tel"
                defaultValue={settings.phone}
                error={errors.phone}
                optional
              />
              <TextInput id="email" label="Email" type="email" defaultValue={settings.email} error={errors.email} optional className="sm:col-span-2" />
              <TextInput
                id="instagram"
                label="Instagram"
                type="url"
                placeholder="https://instagram.com/…"
                defaultValue={settings.instagram}
                error={errors.instagram}
                optional
              />
              <TextInput
                id="facebook"
                label="Facebook"
                type="url"
                placeholder="https://facebook.com/…"
                defaultValue={settings.facebook}
                error={errors.facebook}
                optional
              />
            </div>
          </Card>

          <Card
            title="Location & Google Business Profile"
            description="Google matches your Business Profile to this site by name, address, phone and hours, so keep them identical in both places."
          >
            <div className="space-y-5">
              <Select
                id="businessType"
                label="Type of business"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                error={errors.businessType}
              >
                {BUSINESS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>

              {businessType === "online" ? (
                <p className="rounded-2xl bg-surface-2/60 px-4 py-3 text-xs leading-relaxed text-muted">
                  Google Business Profile is for businesses that meet customers in person. If you deliver to customers instead of
                  having a shop, you can create it as a “service-area business” and hide your address; fully online businesses aren’t
                  eligible. Choose a shop type above if customers can visit you.
                </p>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-6">
                <TextInput
                  id="address"
                  label="Street address"
                  defaultValue={settings.address}
                  maxLength={200}
                  placeholder="e.g. 12 Rue de Marseille"
                  autoComplete="street-address"
                  error={errors.address}
                  optional
                  className="sm:col-span-6"
                />
                <TextInput
                  id="postalCode"
                  label="Postal code"
                  defaultValue={settings.postalCode}
                  maxLength={12}
                  autoComplete="postal-code"
                  error={errors.postalCode}
                  optional
                  className="sm:col-span-2"
                />
                <TextInput
                  id="city"
                  label="City"
                  defaultValue={settings.city}
                  maxLength={80}
                  autoComplete="address-level2"
                  error={errors.city}
                  optional
                  className="sm:col-span-4"
                />
                <TextInput
                  id="region"
                  label="Governorate / region"
                  defaultValue={settings.region}
                  maxLength={80}
                  autoComplete="address-level1"
                  error={errors.region}
                  optional
                  className="sm:col-span-4"
                />
                <TextInput
                  id="country"
                  label="Country code"
                  hint="2 letters, e.g. TN."
                  defaultValue={settings.country}
                  maxLength={2}
                  autoComplete="country"
                  error={errors.country}
                  className="sm:col-span-2 [&_input]:uppercase"
                />
                <TextInput
                  id="latitude"
                  label="Latitude"
                  inputMode="decimal"
                  placeholder="36.8065"
                  defaultValue={settings.latitude}
                  error={errors.latitude}
                  optional
                  className="sm:col-span-3"
                />
                <TextInput
                  id="longitude"
                  label="Longitude"
                  inputMode="decimal"
                  placeholder="10.1815"
                  defaultValue={settings.longitude}
                  error={errors.longitude}
                  optional
                  className="sm:col-span-3"
                />
              </div>
              <p className="-mt-2 text-xs text-muted">
                To get the coordinates, right-click your shop in Google Maps and click the numbers at the top of the menu to copy them.
              </p>

              <HoursEditor initial={settings.openingHours} error={errors.openingHours} />

              <div className="grid gap-5 sm:grid-cols-2">
                <TextInput
                  id="googleMapsUrl"
                  label="Google Maps link"
                  hint="In Google Maps open your business, tap “Share” and copy the link."
                  type="url"
                  placeholder="https://maps.app.goo.gl/…"
                  defaultValue={settings.googleMapsUrl}
                  error={errors.googleMapsUrl}
                  optional
                />
                <TextInput
                  id="googleReviewUrl"
                  label="Google review link"
                  hint="In your Business Profile choose “Ask for reviews” and copy the link."
                  type="url"
                  placeholder="https://g.page/r/…/review"
                  defaultValue={settings.googleReviewUrl}
                  error={errors.googleReviewUrl}
                  optional
                />
              </div>

              <CopyField label="Website to enter in your Business Profile" value={`${seo.siteUrl}/`} />
              <ol className="list-decimal space-y-1.5 ps-5 text-xs leading-relaxed text-muted">
                <li>
                  Go to <span className="font-medium text-ink-2">business.google.com</span> and add your business with exactly the store name,
                  address and phone saved here.
                </li>
                <li>Pick the closest category, enter the website address above and add your opening hours.</li>
                <li>Verify the profile (Google offers a phone call, text, email, video or postcard depending on your business).</li>
                <li>Paste your Maps link and review link above so customers can find you and leave reviews from the store.</li>
              </ol>
            </div>
          </Card>

          <Card
            title="Google search listing"
            description="The words Google reads are your titles, descriptions, headings and product text — put the terms customers search for there."
          >
            <div className="space-y-5">
              <SearchPreview siteName={storeName} url={`${seo.siteUrl}/`} title={searchTitle} description={searchDescription} />
              <Field
                id="seoTitle"
                label={
                  <span className="flex w-full items-baseline justify-between gap-2">
                    Homepage search title <CharCount value={seoTitle} recommended={60} />
                  </span>
                }
                hint="Main keywords first, e.g. “Cartes NFC avis Google en Tunisie | 5ali Review”. Empty uses store name + tagline."
                error={errors.seoTitle}
              >
                {(describedBy, invalid) => (
                  <input
                    id="seoTitle"
                    name="seoTitle"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    maxLength={LIMITS.seoTitle}
                    placeholder={homeSearchTitle({ seoTitle: "", storeName, tagline })}
                    aria-describedby={describedBy}
                    aria-invalid={invalid || undefined}
                    className={controlClass}
                  />
                )}
              </Field>
              <Field
                id="seoDescription"
                label={
                  <span className="flex w-full items-baseline justify-between gap-2">
                    Homepage search description <CharCount value={seoDescription} recommended={155} />
                  </span>
                }
                hint="What you sell, where, and why customers should click. Empty uses the intro text."
                error={errors.seoDescription}
              >
                {(describedBy, invalid) => (
                  <textarea
                    id="seoDescription"
                    name="seoDescription"
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    maxLength={LIMITS.seoDescription}
                    rows={3}
                    aria-describedby={describedBy}
                    aria-invalid={invalid || undefined}
                    className={cn(controlClass, "resize-y leading-relaxed")}
                  />
                )}
              </Field>
              <TextArea
                id="seoKeywords"
                label="Target keywords"
                hint="Comma-separated words people type into Google to find what you sell. Google doesn’t read a keyword list, so the check below shows where each one actually appears."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                rows={3}
                error={errors.seoKeywords}
                optional
              />
              <KeywordCoverage
                keywords={splitKeywords(keywords)}
                places={[
                  { label: "Search title", text: searchTitle },
                  { label: "Search description", text: searchDescription },
                  { label: "Homepage", text: `${heroTitle} ${heroSubtitle} ${tagline}` },
                  { label: "Products", text: catalogText },
                ]}
              />
            </div>
          </Card>

          <Card title="Google Search Console" description="See which searches show your store, how often people click, and get alerts about problems.">
            <div className="space-y-5">
              {!seo.siteUrlConfigured ? (
                <p className="flex items-start gap-2.5 rounded-2xl border border-warn/30 bg-warn-soft px-4 py-3 text-xs leading-relaxed text-warn">
                  <Icon name="alert" size={16} className="mt-px shrink-0" />
                  <span>
                    Set <code className="font-mono">NEXT_PUBLIC_SITE_URL</code> to your domain (e.g. https://myshop.tn) on the server, so
                    Google sees links on your real address. The URLs below use the address you’re visiting now.
                  </span>
                </p>
              ) : null}
              <TextInput
                id="googleSiteVerification"
                label="Google verification code"
                hint={
                  seo.envVerification && !settings.googleSiteVerification
                    ? "A code is already set on the server (GOOGLE_SITE_VERIFICATION). A code entered here takes priority."
                    : "In Search Console, add a “URL prefix” property, choose the “HTML tag” method and paste the tag or just its code."
                }
                placeholder='<meta name="google-site-verification" content="…" />'
                defaultValue={settings.googleSiteVerification}
                autoComplete="off"
                spellCheck={false}
                error={errors.googleSiteVerification}
                optional
              />
              <CopyField label="Sitemap to submit in Search Console" value={`${seo.siteUrl}/sitemap.xml`} />
              <ol className="list-decimal space-y-1.5 ps-5 text-xs leading-relaxed text-muted">
                <li>Open Google Search Console and add your store’s address as a URL-prefix property.</li>
                <li>Choose “HTML tag”, paste it above, save these settings, then click “Verify” in Search Console.</li>
                <li>Under “Sitemaps”, submit the sitemap address above.</li>
                <li>After a few weeks, “Performance → Queries” lists the real searches that show your store — add the best ones to your keywords.</li>
              </ol>
            </div>
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6">
          <Card title="Preview">
            <div
              className="overflow-hidden rounded-2xl border border-line bg-bg"
              style={{ "--accent": validAccent, "--accent-contrast": readableTextOn(validAccent) } as CSSProperties}
            >
              <div className="flex items-center gap-2 border-b border-line bg-surface/70 px-3 py-2.5">
                <BrandMark name={storeName || "S"} className="size-6 text-sm" />
                <span className="truncate text-xs font-semibold">{storeName || "Your store"}</span>
              </div>
              <div className="px-4 py-6">
                <p className="text-xl leading-tight font-semibold tracking-[-0.03em]">
                  {splitHighlight(heroTitle || storeName || "Your headline").map((part, i) =>
                    part.highlight ? (
                      <span key={i} className="text-accent-text">
                        {part.text}
                      </span>
                    ) : (
                      <span key={i}>{part.text}</span>
                    ),
                  )}
                </p>
                <span className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-3.5 text-xs font-medium text-accent-contrast">
                  Browse products
                </span>
              </div>
            </div>
          </Card>
          <div className="rounded-3xl border border-line bg-surface p-5">
            <SubmitButton variant="accent" className="w-full" pending={saving} pendingLabel="Saving…">
              <Icon name="check" size={17} />
              Save settings
            </SubmitButton>
            <p className="mt-3 text-center text-xs text-muted">Changes go live in the store immediately.</p>
          </div>
        </aside>
      </div>
      <Toast state={state} />
    </form>
  );
}

/** Shows, for each target keyword, where it appears in the text Google reads. */
function KeywordCoverage({ keywords, places }: { keywords: string[]; places: { label: string; text: string }[] }) {
  if (keywords.length === 0) return null;
  const normalised = places.map((p) => ({ label: p.label, text: normaliseForSearch(p.text) }));
  const rows = keywords.map((keyword) => {
    const k = normaliseForSearch(keyword);
    return { keyword, found: normalised.filter((p) => p.text.includes(k)).map((p) => p.label) };
  });
  const used = rows.filter((r) => r.found.length > 0).length;

  return (
    <div className="rounded-2xl border border-line">
      <p className="border-b border-line px-4 py-2.5 text-xs font-medium text-ink-2">
        {used} of {rows.length} keywords appear in your store
      </p>
      <ul className="divide-y divide-line">
        {rows.map(({ keyword, found }) => (
          <li key={keyword} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-sm">
            <Icon
              name={found.length > 0 ? "checkCircle" : "info"}
              size={16}
              className={cn("shrink-0", found.length > 0 ? "text-success" : "text-muted")}
            />
            <span className="min-w-0 flex-1 font-medium">{keyword}</span>
            {found.length > 0 ? (
              <span className="flex flex-wrap gap-1">
                {found.map((label) => (
                  <span key={label} className="rounded-full bg-success-soft px-2 py-0.5 text-[0.7rem] font-medium text-success">
                    {label}
                  </span>
                ))}
              </span>
            ) : (
              <span className="text-xs text-muted">Not used yet — add it to a title, description or product</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
