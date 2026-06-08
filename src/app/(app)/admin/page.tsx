import { getAdminStats, type DayCount } from "@/lib/admin-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBRL, frequencyLabels } from "@/lib/format";

export const metadata = { title: "Painel admin — Fechô" };

// Sempre dados frescos: métricas não fazem sentido em cache.
export const dynamic = "force-dynamic";

const chargeStatusLabels: Record<string, string> = {
  PENDING: "Pendentes",
  PROOF_SENT: "Em análise",
  PAID: "Pagas",
  REJECTED: "Recusadas",
};

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

// Mini gráfico de barras (sem libs): altura proporcional ao pico da série.
function BarChart({ data, label }: { data: DayCount[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {total} nos últimos 30 dias
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex h-28 items-end gap-0.5">
          {data.map((d) => (
            <div
              key={d.day}
              className="flex-1 rounded-t-sm bg-primary/70 transition-colors hover:bg-primary"
              style={{ height: `${(d.count / max) * 100}%` }}
              title={`${d.day}: ${d.count}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Distribution({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number }[];
}) {
  const total = Math.max(1, rows.reduce((s, r) => s + r.value, 0));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{r.label}</span>
              <span className="font-medium">{r.value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(r.value / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function AdminPage() {
  const s = await getAdminStats();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Painel admin</h1>
        <p className="text-muted-foreground">
          Visão geral do Fechô. Números de negócio direto do banco.
        </p>
      </header>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Usuários"
          value={s.users.total}
          hint={`+${s.users.new7d} em 7d · +${s.users.new30d} em 30d`}
        />
        <Kpi
          label="Grupos"
          value={s.groups.total}
          hint={`${s.groups.active} ativos · ${s.groups.inactive} inativos`}
        />
        <Kpi label="Membros cadastrados" value={s.members.total} />
        <Kpi
          label="Cobranças"
          value={s.charges.total}
          hint={`${s.charges.defaulters} inadimplentes`}
        />
        <Kpi label="Arrecadado" value={formatBRL(s.charges.collected)} />
        <Kpi label="Em aberto" value={formatBRL(s.charges.outstanding)} />
        <Kpi
          label="Comprovantes p/ revisar"
          value={s.payments.pendingReview}
        />
        <Kpi
          label="Plano PRO"
          value={s.users.pro}
          hint={`${s.users.free} no FREE`}
        />
      </div>

      {/* Gráficos de crescimento */}
      <div className="grid gap-4 lg:grid-cols-2">
        <BarChart data={s.signupsByDay} label="Novos usuários por dia" />
        <BarChart data={s.groupsByDay} label="Novos grupos por dia" />
      </div>

      {/* Distribuições */}
      <div className="grid gap-4 md:grid-cols-3">
        <Distribution
          title="Por plano"
          rows={[
            { label: "FREE", value: s.users.free },
            { label: "PRO", value: s.users.pro },
          ]}
        />
        <Distribution
          title="Login dos usuários"
          rows={[
            { label: "Com senha", value: s.users.withPassword },
            { label: "Com Google", value: s.users.withGoogle },
          ]}
        />
        <Distribution
          title="Grupos por frequência"
          rows={[
            { label: frequencyLabels.MONTHLY, value: s.groups.byFreq.MONTHLY },
            { label: frequencyLabels.WEEKLY, value: s.groups.byFreq.WEEKLY },
            { label: frequencyLabels.ONCE, value: s.groups.byFreq.ONCE },
          ]}
        />
      </div>

      {/* Cobranças por status */}
      <Card>
        <CardHeader>
          <CardTitle>Cobranças por status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Object.entries(chargeStatusLabels).map(([status, label]) => {
              const row = s.charges.byStatus[status];
              return (
                <div key={status}>
                  <p className="text-2xl font-semibold">{row?.count ?? 0}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBRL(row?.sum ?? 0)}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Listas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Últimos cadastros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.recentUsers.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum ainda.</p>
            )}
            {s.recentUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{u.name ?? "—"}</p>
                  <p className="truncate text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  {u.plan === "PRO" && <Badge>PRO</Badge>}
                  <span className="text-muted-foreground">
                    {dateFmt.format(u.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maiores grupos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.topGroups.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum ainda.</p>
            )}
            {s.topGroups.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <p className="truncate font-medium">{g.name}</p>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  {g.status === "INACTIVE" && (
                    <Badge variant="secondary">inativo</Badge>
                  )}
                  <span className="text-muted-foreground">
                    {g.memberCount} membros
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
