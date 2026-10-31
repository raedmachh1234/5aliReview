import { randomUUID } from "node:crypto";
import { DEFAULT_ACCENT } from "@/lib/contrast";
import type { Product, ProductInput, StoreSettings } from "@/lib/types";

export const defaultSettings: StoreSettings = {
  storeName: "5ali Review",
  tagline: "Google review NFC stands for businesses in Tunisia.",
  heroTitle: "More Google reviews for your business, *one tap* at a time.",
  heroSubtitle:
    "Put the stand on your counter. Customers tap it with their phone and your Google review page opens — no app needed.",
  announcement: "",
  currency: "TND",
  accentColor: DEFAULT_ACCENT,
  whatsapp: "",
  phone: "+216 92 057 092",
  email: "5alireviewtn@gmail.com",
  address: "",
  postalCode: "",
  city: "",
  region: "",
  country: "TN",
  latitude: "",
  longitude: "",
  openingHours: [],
  businessType: "Store",
  googleMapsUrl: "",
  googleReviewUrl: "",
  instagram: "",
  facebook: "",
  seoTitle: "",
  seoDescription: "",
  // Starting points for an NFC/QR review-card shop in Tunisia — see docs/SEO.md.
  seoKeywords:
    "carte NFC, carte NFC avis Google, plaque NFC avis Google, QR code avis Google, carte de visite NFC, carte NFC Tunisie, NFC review card, Google reviews",
  googleSiteVerification: "",
};

/** Sample catalogue for a fresh install — edit or delete these from the admin panel. */
const samples: Omit<ProductInput, "seoTitle" | "seoDescription">[] = [
  {
    slug: "nfc-review-card",
    name: "NFC Review Card",
    tagline: "One tap opens your Google review page — no app needed.",
    description:
      "A credit-card sized NFC card that sends customers straight to your Google review page with a single tap.\n\nThe printed QR code on the back covers phones without NFC, so nobody is left out.",
    price: 35,
    compareAtPrice: 45,
    sku: "NFC-CARD-01",
    stock: 120,
    category: "NFC Cards",
    tags: ["Google reviews", "NFC", "Bestseller"],
    images: ["/samples/nfc-review-card.svg"],
    specs: [
      { label: "Chip", value: "NTAG215" },
      { label: "Size", value: "85.6 × 54 mm" },
      { label: "Material", value: "PVC, matte finish" },
      { label: "Works with", value: "iPhone & Android (NFC)" },
    ],
    status: "published",
    featured: true,
  },
  {
    slug: "qr-sticker-pack",
    name: "QR Sticker Pack (×10)",
    tagline: "Waterproof QR stickers for doors, menus and packaging.",
    description: "Ten waterproof vinyl stickers printed with your QR code. Stick them on doors, menus, receipts or delivery bags.",
    price: 25,
    compareAtPrice: null,
    sku: "QR-STICK-10",
    stock: 3,
    category: "Stickers",
    tags: ["QR code", "Packaging"],
    images: ["/samples/qr-sticker-pack.svg"],
    specs: [
      { label: "Size", value: "8 × 8 cm" },
      { label: "Finish", value: "Waterproof vinyl" },
      { label: "Quantity", value: "10 stickers" },
    ],
    status: "published",
    featured: false,
  },
  {
    slug: "smart-metal-business-card",
    name: "Smart Metal Business Card",
    tagline: "Laser-engraved steel card that shares your contact in one tap.",
    description:
      "A premium stainless-steel business card with an embedded NFC chip. Tap it on a phone to share your contact details, website or social profiles.",
    price: 89,
    compareAtPrice: 110,
    sku: "NFC-METAL-01",
    stock: 0,
    category: "NFC Cards",
    tags: ["NFC", "Premium", "Networking"],
    images: ["/samples/smart-metal-card.svg"],
    specs: [
      { label: "Material", value: "Stainless steel, black" },
      { label: "Engraving", value: "Laser" },
      { label: "Chip", value: "NTAG216" },
    ],
    status: "published",
    featured: true,
  },
  {
    slug: "nfc-keychain-tag",
    name: "NFC Keychain Tag",
    tagline: "Your link on a keyring — always in your pocket.",
    description: "A durable epoxy keychain tag with an NFC chip. Program it with any link: your menu, your Instagram or your review page.",
    price: 19,
    compareAtPrice: null,
    sku: "NFC-KEY-01",
    stock: null,
    category: "Accessories",
    tags: ["NFC", "Gift"],
    images: ["/samples/nfc-keychain.svg"],
    specs: [
      { label: "Diameter", value: "30 mm" },
      { label: "Material", value: "Epoxy resin" },
    ],
    status: "published",
    featured: false,
  },
  {
    slug: "review-starter-kit",
    name: "Review Starter Kit",
    tagline: "Everything a shop needs to start collecting reviews.",
    description: "One table stand, five NFC review cards and ten QR stickers in a single box — the quickest way to get started.",
    price: 149,
    compareAtPrice: 189,
    sku: "KIT-START-01",
    stock: 15,
    category: "Bundles",
    tags: ["Bundle", "Best value"],
    images: ["/samples/review-starter-kit.svg"],
    specs: [
      { label: "Includes", value: "1 stand, 5 cards, 10 stickers" },
      { label: "Ideal for", value: "Cafés, salons, shops" },
    ],
    status: "published",
    featured: true,
  },
  {
    // The store's own product, with real photos.
    slug: "nfc-table-stand",
    name: "Google Review NFC Stand",
    tagline: "Customers tap it with their phone and your Google review page opens.",
    description:
      "A blue-and-white acrylic plaque with a built-in NFC chip, on a small table stand. Put it on your counter or on tables: customers hold their phone near it and your Google review page opens straight away.\n\nNo app to install, and it works with iPhone and Android phones that have NFC.",
    price: 59,
    compareAtPrice: null,
    sku: "NFC-STAND-01",
    stock: 40,
    category: "Stands",
    tags: ["Google reviews", "NFC"],
    images: ["/samples/google-review-stand.webp", "/samples/google-review-plaque.jpg"],
    specs: [
      { label: "Material", value: "Acrylic" },
      { label: "Connection", value: "NFC, no app needed" },
      { label: "Works with", value: "iPhone & Android" },
      { label: "Stand", value: "Included" },
    ],
    status: "published",
    featured: true,
  },
  {
    slug: "wall-display-plaque",
    name: "Wall Display Plaque",
    tagline: "A wall-mounted NFC plaque for entrances and counters.",
    description: "Work in progress — not visible in the store until published.",
    price: 79,
    compareAtPrice: null,
    sku: "NFC-WALL-01",
    stock: 0,
    category: "Stands",
    tags: ["NFC"],
    images: ["/samples/wall-plaque.svg"],
    specs: [],
    status: "draft",
    featured: false,
  },
];

export function sampleProducts(now = Date.now()): Product[] {
  // Stagger creation dates so "newest first" has a stable order.
  return samples.map((input, i) => {
    const at = new Date(now - (samples.length - i) * 60_000).toISOString();
    return { ...input, seoTitle: "", seoDescription: "", id: randomUUID(), createdAt: at, updatedAt: at };
  });
}
