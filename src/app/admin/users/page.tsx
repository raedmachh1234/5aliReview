import { requirePlatformAdmin } from "@/server/auth/guards";
import { removeMembershipAction, setMembershipAction, setPlatformAdminAction } from "@/server/actions/admin";
import { adminText as a } from "@/i18n/admin";
import { getI18n } from "@/i18n/server";
import { formDict } from "@/lib/form-state";
import { ActionForm, FormInput, FormSelect, SubmitButton } from "@/components/forms/action-form";
import { ConfirmAction } from "@/components/forms/confirm-action";
import { AdminTable, adminDate } from "@/components/admin/table";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/surface";

export default async function AdminUsers() {
  const { user, repo } = await requirePlatformAdmin();
  const { t } = await getI18n();
  const [users, businesses] = await Promise.all([repo.admin.listUsers(user), repo.admin.listBusinesses(user)]);

  return (
    <>
      <PageHeader title={a.nav.users} description={a.users.lead} />
      <Card className="mb-6">
        <AdminTable label={a.nav.users} head={[a.users.email, a.users.memberships, a.users.admin, a.common.created]} minWidth="56rem">
          {users.map((u) => (
            <tr key={u.id}>
              <th scope="row" className="text-start align-top">
                <span className="font-semibold text-ink">{u.email}</span>
                {u.fullName ? <span className="block font-normal text-muted">{u.fullName}</span> : null}
              </th>
              <td className="align-top">
                {u.memberships.length ? (
                  <ul className="space-y-1.5">
                    {u.memberships.map((m) => (
                      <li key={m.businessId} className="flex flex-wrap items-center gap-2">
                        <span>{m.businessName}</span>
                        <Badge tone="brand">{t.dashboard.roles[m.role]}</Badge>
                        <form action={removeMembershipAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="businessId" value={m.businessId} />
                          <button type="submit" className="text-xs font-semibold text-danger underline underline-offset-2">
                            {a.users.remove}
                            <span className="sr-only"> {m.businessName}</span>
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-muted">{a.users.none}</span>
                )}
              </td>
              <td className="align-top">
                {u.isPlatformAdmin ? <Badge tone="danger" icon="lock">{a.users.admin}</Badge> : null}
                {u.id !== user.userId ? (
                  <div className="mt-1.5">
                    <ConfirmAction
                      trigger={u.isPlatformAdmin ? a.users.removeAdmin : a.users.makeAdmin}
                      title={u.isPlatformAdmin ? a.users.removeAdmin : a.users.makeAdmin}
                      body={a.users.adminBody}
                      confirmLabel={u.isPlatformAdmin ? a.users.removeAdmin : a.users.makeAdmin}
                      cancelLabel={a.common.cancel}
                      action={setPlatformAdminAction}
                      hidden={{ userId: u.id, isAdmin: u.isPlatformAdmin ? "false" : "true" }}
                      triggerVariant="secondary"
                      variant={u.isPlatformAdmin ? "danger" : "primary"}
                    />
                  </div>
                ) : null}
              </td>
              <td className="align-top whitespace-nowrap text-ink-2">{adminDate(u.createdAt)}</td>
            </tr>
          ))}
        </AdminTable>
      </Card>

      <Card>
        <CardHeader title={a.users.grant} />
        <div className="p-5">
          <ActionForm
            action={setMembershipAction}
            dict={formDict(t, { admin: { notFound: a.users.notFound } })}
            errorSummary={t.errors.formErrors}
            className="grid gap-4 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-end"
            resetOnSuccess
          >
            <FormInput name="email" type="email" label={a.users.email} required />
            <FormSelect name="businessId" label={a.users.business} required defaultValue="">
              <option value="" disabled>
                —
              </option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </FormSelect>
            <FormSelect name="role" label={a.users.role} defaultValue="viewer">
              {(["owner", "manager", "viewer"] as const).map((r) => (
                <option key={r} value={r}>
                  {t.dashboard.roles[r]}
                </option>
              ))}
            </FormSelect>
            <SubmitButton pendingLabel={a.common.saving}>{a.users.grant}</SubmitButton>
          </ActionForm>
        </div>
      </Card>
    </>
  );
}
