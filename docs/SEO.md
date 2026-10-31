# Getting found on Google

This store is ready for Google Search Console and Google Business Profile.
This guide covers the three things that bring visitors from Google:

1. Using the right words in the places Google reads.
2. Connecting Google Search Console, so you see what people search for.
3. Creating a Google Business Profile, so you appear on Google Maps and in local results.

Everything below is set in **Admin → Settings** and **Admin → Products** — no code changes needed.

---

## 1. Keywords: the words customers type into Google

Google doesn't take a list of keywords from you; it ignores the old `keywords` meta tag.
It ranks pages on the words that actually appear in them: page titles, descriptions, headings, product names and
product text. So the job is to use the words customers search for in those places.

### Suggested keywords to start with

These suit a shop selling NFC cards, review stands and QR stickers in Tunisia. They are **starting points, not
measured search volumes**. Check them with the tools in [Find the real most-searched words](#find-the-real-most-searched-words)
and keep the ones people actually use.

**French — most searches in Tunisia for these products are likely in French**

| Topic | Keywords |
| --- | --- |
| Review cards | carte NFC avis Google · carte avis Google · carte NFC avis clients |
| Stands & plaques | plaque NFC avis Google · présentoir avis Google · présentoir NFC |
| QR codes | QR code avis Google · sticker QR code · autocollant QR code personnalisé |
| Business cards | carte de visite NFC · carte de visite connectée · carte de visite digitale |
| Goals people search for | obtenir plus d'avis Google · augmenter ses avis Google |
| Local | carte NFC Tunisie · carte de visite NFC Tunisie · carte NFC Tunis / Sfax / Sousse |

**English**

NFC review card · Google review card · tap to review card · NFC business card · smart business card · QR code review stand

**Arabic**

بطاقة NFC · بطاقة زيارة ذكية · بطاقة تقييم جوجل · تقييمات جوجل

### Where to put them

| Place | Where to edit it | Tip |
| --- | --- | --- |
| Homepage title in Google | Settings → Google search listing | Main keyword first, then your name: `Cartes NFC avis Google en Tunisie \| 5ali Review` (under ~60 characters) |
| Homepage description | Settings → Google search listing | One or two sentences with 1–2 keywords and a reason to click (under ~155 characters) |
| Product names | Products → edit | Name products the way people search: “Carte NFC avis Google” is found more easily than a brand-only name |
| Product search title & description | Products → edit → Search engine listing | One main keyword per product; each product targets a different one |
| Product descriptions | Products → edit → Full description | Describe the product naturally; mention the use (“pour obtenir plus d'avis Google”) |
| Categories and tags | Products → edit → Organisation | Use searched words: “Cartes NFC”, “Stickers QR code” |
| Target keywords list | Settings → Google search listing | Not sent to Google. The checker under it shows where each keyword appears in your store |

Write for people first. Repeating a keyword many times (“keyword stuffing”) hurts rankings.

**Language:** the store's built-in labels are in English and pages are marked as English. If you write your
products in French, switch the page language to French in `src/app/layout.tsx` (`lang="fr"`), so Google shows the
pages to French-speaking searchers.

### Find the real most-searched words

- **Google Search Console → Performance → Queries.** After a few weeks online it lists the real searches that showed
  your store, with clicks and impressions. This is the most reliable source; add the best queries to your titles.
- **Google Keyword Planner** (free with a Google Ads account, no ad spend needed) → “Discover new keywords”. Set the
  location to Tunisia and the language to French or Arabic to see average monthly searches.
- **Google Trends** (trends.google.com). Compare terms (e.g. “carte NFC” vs “carte de visite NFC”) with the region set to Tunisia.
- **Google itself.** Type a keyword and look at the autocomplete suggestions, “People also ask” and
  “Related searches” at the bottom of the page.

---

## 2. Google Search Console

1. Deploy the store on its real domain and set `NEXT_PUBLIC_SITE_URL` (e.g. `https://myshop.tn`).
2. In [Search Console](https://search.google.com/search-console), add a **URL prefix** property with that address.
3. Choose the **HTML tag** method, copy the tag, paste it in **Settings → Google Search Console** and save.
4. Click **Verify** in Search Console.
5. Under **Sitemaps**, submit the sitemap address shown in Settings (`https://your-domain/sitemap.xml`).

The store already provides the sitemap with product photos, `robots.txt`, canonical URLs and structured data
(products, breadcrumbs, your business), and keeps the admin, drafts and search results out of Google.

---

## 3. Google Business Profile

Google Business Profile puts you on Google Maps and in the local box of search results, with your hours, reviews and
photos. Google allows it for businesses that meet customers in person: a shop people can visit, or a business
that delivers to or visits customers (a “service-area business”, which can hide its address). Fully online
businesses aren't eligible.

### In the store (Settings → Location & Google Business Profile)

1. Choose your **type of business** (e.g. Electronics store, or Shop).
2. Fill in the **street address, postal code, city, governorate and country**, the **phone** (Contact card) and
   **opening hours**, exactly as they will appear on Google.
3. Optional: add the **latitude/longitude** (right-click your shop in Google Maps and click the coordinates to copy them).

The store then shows this information in the footer and contact section, and publishes it as `LocalBusiness`
structured data. Google uses it to match your website with your profile.

### On Google

1. Go to [business.google.com](https://business.google.com) and add your business. Use **exactly the same name,
   address and phone** as in the store. Differences confuse Google.
2. **Category:** choose the closest match. To see what competitors use, look under their name on Google Maps,
   or search the category list for words like “print”, “sign” or “electronics”.
3. **Website:** enter your store address (shown in Settings with a Copy button).
4. Add your **opening hours**, a **description** that mentions what you sell (use your keywords naturally), and
   **photos** of your shop and products.
5. **Verify** the profile. Google offers phone, text, email, video or postcard depending on the business; it can take a few days.
6. Back in the store, paste:
   - **Google Maps link:** in Google Maps open your business → Share → copy link. It becomes “Get directions” in the store.
   - **Google review link:** in your profile choose “Ask for reviews” → copy link. It becomes “Review us on Google” in the store.

### Keep it working

- Ask happy customers for reviews (the review link, or your own NFC cards) and reply to every review.
- Update your hours for holidays in both places.
- Post news and new products on the profile from time to time, so customers see you're active.
