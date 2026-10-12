import { loadDashboard } from "@/server/dashboard";
import { cardQrUrl } from "@/lib/card-urls";
import { fmt } from "@/i18n/config";
import { Badge, Card, EmptyState, PageHeader, Alert } from "@/components/ui/surface";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export default async function QrCodesPage(props: PageProps<"/dashboard/[businessId]/qr-codes">) {
  const { businessId } = await props.params;
  const { user, repo, t } = await loadDashboard(businessId);
  const [cards, locations] = await Promise.all([repo.listCards(user, businessId), repo.listLocations(user, businessId)]);
  const q = t.dashboard.qr;

  return (
    <>
      <PageHeader title={q.title} description={q.lead} />
      <Alert tone="neutral" className="mb-6">
        {q.tip}
      </Alert>
      {cards.length === 0 ? (
        <Card>
          <EmptyState icon="qr" title={t.dashboard.empty.cardsTitle}>
            {t.dashboard.empty.cardsBody}
          </EmptyState>
        </Card>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const src = `/api/qr/${businessId}/${card.id}`;
            return (
              <li key={card.id}>
                <Card className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold text-ink">{card.label}</h2>
                    {card.status === "inactive" ? <Badge>{t.dashboard.cards.inactive}</Badge> : null}
                  </div>
                  <p className="text-sm text-muted">{locations.find((l) => l.id === card.locationId)?.name ?? t.dashboard.cards.businessPage}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element -- generated on our own server */}
                  <img
                    src={src}
                    alt={fmt(q.alt, { label: card.label })}
                    width={220}
                    height={220}
                    loading="lazy"
                    className="mx-auto my-4 size-[220px] rounded-xl border border-line bg-white p-2"
                  />
                  <p className="mb-4 truncate text-center font-mono text-xs text-muted" dir="ltr">
                    {cardQrUrl(card.code)}
                  </p>
                  <div className="mt-auto flex gap-2">
                    <a href={`${src}?format=svg&download=1`} className={buttonClass("secondary", "sm", "flex-1")}>
                      <Icon name="download" size={16} /> {q.downloadSvg}
                    </a>
                    <a href={`${src}?format=png&download=1`} className={buttonClass("secondary", "sm", "flex-1")}>
                      <Icon name="download" size={16} /> {q.downloadPng}
                    </a>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
