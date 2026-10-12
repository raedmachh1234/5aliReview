import Link from "next/link";
import { requirePlatformAdmin } from "@/server/auth/guards";
import { adminText as a } from "@/i18n/admin";
import { cardNfcUrl } from "@/lib/card-urls";
import { AdminTable, adminDate } from "@/components/admin/table";
import { Badge, Card, PageHeader } from "@/components/ui/surface";

export default async function AdminCards() {
  const { user, repo } = await requirePlatformAdmin();
  const cards = await repo.admin.listAllCards(user);
  return (
    <>
      <PageHeader title={a.nav.cards} description={a.cards.lead} />
      <Card>
        <AdminTable label={a.nav.cards} head={[a.cards.code, a.cards.business, a.cards.destination, a.cards.status, a.common.created]} minWidth="52rem">
          {cards.map((c) => (
            <tr key={c.id}>
              <th scope="row" className="text-start font-mono font-semibold" dir="ltr">
                {c.code}
                <span className="block font-sans text-xs font-normal text-muted">{cardNfcUrl(c.code)}</span>
              </th>
              <td>
                <Link href={`/dashboard/${c.businessId}/nfc-cards`} className="font-semibold text-pine underline underline-offset-4">
                  {c.businessName}
                </Link>
                <span className="block text-muted">{c.label}</span>
              </td>
              <td className="text-ink-2" dir="ltr">
                /r/{c.businessSlug}
                {c.locationSlug ? `?loc=${c.locationSlug}` : ""}
              </td>
              <td>
                <Badge tone={c.status === "active" ? "success" : "neutral"}>{c.status}</Badge>
              </td>
              <td className="whitespace-nowrap text-ink-2">{adminDate(c.createdAt)}</td>
            </tr>
          ))}
        </AdminTable>
      </Card>
    </>
  );
}
