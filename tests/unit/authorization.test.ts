import { beforeEach, describe, expect, it } from "vitest";
import { createDemoRepository, resetDemoStore } from "@/server/data/demo";
import { AccessDeniedError } from "@/server/data/repository";
import type { Actor } from "@/lib/types";

/**
 * Tenant isolation: Business A must never read or change Business B's data.
 * The demo repository mirrors the Postgres RLS policies (supabase/migrations/0002_rls.sql),
 * which have their own pgTAP tests in supabase/tests/rls.test.sql.
 */
const BAHIA = "10000000-0000-4000-8000-000000000001";
const SALON = "10000000-0000-4000-8000-000000000002";
const owner: Actor = { userId: "00000000-0000-4000-8000-000000000001", email: "owner@demo.5ali.tn", isPlatformAdmin: false };
const manager: Actor = { userId: "00000000-0000-4000-8000-000000000002", email: "manager@demo.5ali.tn", isPlatformAdmin: false };
const salonOwner: Actor = { userId: "00000000-0000-4000-8000-000000000003", email: "salon@demo.5ali.tn", isPlatformAdmin: false };
const admin: Actor = { userId: "00000000-0000-4000-8000-000000000004", email: "admin@demo.5ali.tn", isPlatformAdmin: true };
const range = { from: "2000-01-01T00:00:00.000Z", to: "2100-01-01T00:00:00.000Z" };

describe("tenant isolation", () => {
  beforeEach(() => resetDemoStore());
  const repo = createDemoRepository();

  it("an owner can read their own feedback", async () => {
    const page = await repo.listFeedback(owner, BAHIA, { range });
    expect(page.total).toBeGreaterThan(0);
    expect(page.items.every((f) => f.businessId === BAHIA)).toBe(true);
  });

  it("an owner cannot read another business's feedback, stats, cards or export", async () => {
    await expect(repo.listFeedback(owner, SALON, { range })).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(repo.getStats(owner, SALON, range)).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(repo.listCards(owner, SALON)).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(repo.exportFeedback(owner, SALON)).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(repo.getBusiness(salonOwner, BAHIA)).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("an owner cannot modify another business", async () => {
    await expect(repo.createCard(owner, SALON, { label: "x", locationId: null })).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(repo.setRetention(owner, SALON, 1)).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("cannot attach a card to another business's location", async () => {
    const salonLoc = "20000000-0000-4000-8000-000000000001"; // belongs to Café El Bahia
    await expect(repo.createCard(salonOwner, SALON, { label: "x", locationId: salonLoc })).rejects.toThrow();
  });

  it("roles are enforced: a manager can edit cards but not billing or retention", async () => {
    await expect(repo.createCard(manager, BAHIA, { label: "Table 9", locationId: null })).resolves.toBeTruthy();
    await expect(repo.listInvoices(manager, BAHIA)).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(repo.setRetention(manager, BAHIA, 6)).rejects.toBeInstanceOf(AccessDeniedError);
  });

  it("admin functions refuse non-admins, even with a forged isPlatformAdmin flag", async () => {
    await expect(repo.admin.listUsers(owner)).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(repo.admin.listUsers({ ...owner, isPlatformAdmin: true })).rejects.toBeInstanceOf(AccessDeniedError);
    await expect(repo.admin.listUsers(admin)).resolves.toBeTruthy();
  });

  it("public business data exposes no private fields", async () => {
    const pub = await repo.getPublicBusiness("cafe-el-bahia");
    expect(pub).not.toBeNull();
    expect(Object.keys(pub!)).not.toContain("googleReviewUrl");
    expect(Object.keys(pub!)).not.toContain("id");
    expect(Object.keys(pub!)).not.toContain("email");
  });

  it("suspended businesses are unavailable to customers and cards stop resolving", async () => {
    await repo.admin.setBusinessStatus(admin, BAHIA, "suspended");
    expect(await repo.getPublicBusiness("cafe-el-bahia")).toBeNull();
    expect(await repo.resolveCard("CAFEMRS2")).toBeNull();
    expect(await repo.submitFeedback({ slug: "cafe-el-bahia", rating: 5, source: "nfc" })).toBe("not_found");
  });

  it("inactive cards don't resolve", async () => {
    expect(await repo.resolveCard("CAFETBL3")).toBeNull();
    expect(await repo.resolveCard("CAFEMRS2")).toEqual({ slug: "cafe-el-bahia", locationSlug: "la-marsa" });
  });
});
