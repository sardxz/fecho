import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBRL, frequencyLabels, describeRecurrence } from "@/lib/format";
import { formatPhoneBR } from "@/lib/phone";
import { MemberForm } from "./member-form";
import { ChargeGenerator } from "./charge-generator";
import { ReviewActions } from "./review-actions";
import {
  addMember,
  removeMember,
  generateCharges,
  approvePayment,
  rejectPayment,
} from "./actions";

const FREE_MEMBER_LIMIT = 10;

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

// Status do membro para exibição.
function memberStatusBadge(status: string): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case "ACTIVE":
      return { label: "Ativo", variant: "default" };
    case "PENDING":
      return { label: "Pendente", variant: "secondary" };
    default:
      return { label: status, variant: "outline" };
  }
}

// "Vencido" é calculado on-the-fly (decisão #3): vencimento < agora E pendente.
function chargeStatusBadge(
  status: string,
  dueDate: Date,
): { label: string; variant: BadgeVariant } {
  if (status === "PENDING" && dueDate.getTime() < Date.now()) {
    return { label: "Vencido", variant: "destructive" };
  }
  switch (status) {
    case "PENDING":
      return { label: "Pendente", variant: "outline" };
    case "PROOF_SENT":
      return { label: "Comprovante enviado", variant: "secondary" };
    case "PAID":
      return { label: "Pago", variant: "default" };
    case "REJECTED":
      return { label: "Recusado", variant: "destructive" };
    default:
      return { label: status, variant: "outline" };
  }
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

type ChargeForSummary = {
  status: string;
  amount: { toString(): string };
  dueDate: Date;
  memberId: string;
};

// Resumo financeiro do grupo. "Arrecadado" = cobranças pagas; "em aberto" =
// tudo que não foi pago. Inadimplente = membro com cobrança vencida (mesma
// regra do badge: pendente e vencimento no passado). Isolado numa função pra
// manter o componente puro (Date.now() não pode ser chamado direto no render).
function computeSummary(charges: ChargeForSummary[]) {
  const now = Date.now();
  let collected = 0;
  let outstanding = 0;
  const defaultersSet = new Set<string>();
  for (const c of charges) {
    const amount = Number(c.amount.toString());
    if (c.status === "PAID") {
      collected += amount;
    } else {
      outstanding += amount;
    }
    if (c.status === "PENDING" && c.dueDate.getTime() < now) {
      defaultersSet.add(c.memberId);
    }
  }
  return { collected, outstanding, defaulters: defaultersSet.size };
}

export default async function GroupPanelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const group = await db.group.findUnique({
    where: { id },
    include: {
      owner: { select: { plan: true } },
      members: {
        where: { status: { not: "REMOVED" } },
        orderBy: { createdAt: "asc" },
      },
      charges: {
        orderBy: { dueDate: "desc" },
        include: {
          member: { select: { name: true } },
          payments: {
            where: { status: "PENDING_REVIEW" },
            orderBy: { createdAt: "desc" },
            select: { id: true, observation: true, createdAt: true },
          },
        },
      },
    },
  });

  // Ownership: grupo inexistente ou de outro dono → 404.
  if (!group || group.ownerId !== session.user.id) notFound();

  const isActive = group.status === "ACTIVE";
  const isFree = group.owner.plan === "FREE";
  const memberCount = group.members.length;
  const canAddMember = !isFree || memberCount < FREE_MEMBER_LIMIT;

  const { collected, outstanding, defaulters } = computeSummary(group.charges);

  // Fila de revisão: cada comprovante PENDING_REVIEW vira uma linha, com os
  // dados da cobrança a que pertence. Mais recentes primeiro.
  const pendingProofs = group.charges
    .flatMap((c) =>
      c.payments.map((p) => ({
        paymentId: p.id,
        observation: p.observation,
        sentAt: p.createdAt,
        memberName: c.member.name,
        amount: c.amount.toString(),
      })),
    )
    .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());

  return (
    <div className="flex flex-col gap-8">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              ← Grupos
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight">
              {group.name}
            </h1>
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/dashboard/grupos/${group.id}/editar`} />}
          >
            Editar grupo
          </Button>
        </div>
        {group.description && (
          <p className="text-muted-foreground">{group.description}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>
            Valor padrão:{" "}
            <span className="font-medium text-foreground">
              {formatBRL(group.defaultAmount.toString())}
            </span>
          </span>
          <span>{frequencyLabels[group.frequency]}</span>
          <span>
            Pix: <span className="font-mono">{group.pixKey}</span>
          </span>
        </div>
        <p className="text-sm font-medium text-foreground">
          {describeRecurrence(group.frequency, group.weekday, group.dueDay)}
        </p>
      </header>

      {/* Resumo financeiro */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Arrecadado</CardDescription>
            <CardTitle className="text-2xl text-foreground">
              {formatBRL(collected)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            Cobranças já pagas.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Em aberto</CardDescription>
            <CardTitle className="text-2xl text-foreground">
              {formatBRL(outstanding)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            Ainda não recebido.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inadimplentes</CardDescription>
            <CardTitle className="text-2xl text-foreground">
              {defaulters}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-muted-foreground">
            {defaulters === 1 ? "membro com cobrança vencida" : "membros com cobrança vencida"}
          </CardContent>
        </Card>
      </section>

      {/* Comprovantes a revisar */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Comprovantes a revisar
          </h2>
          <p className="text-sm text-muted-foreground">
            {pendingProofs.length === 0
              ? "Nenhum comprovante aguardando revisão."
              : `${pendingProofs.length} ${pendingProofs.length === 1 ? "comprovante aguardando" : "comprovantes aguardando"} sua aprovação.`}
          </p>
        </div>

        {pendingProofs.length > 0 && (
          <div className="flex flex-col gap-3">
            {pendingProofs.map((p) => (
              <Card key={p.paymentId}>
                <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">{p.memberName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatBRL(p.amount)} · enviado em {formatDate(p.sentAt)}
                    </p>
                    {p.observation && (
                      <p className="text-sm text-muted-foreground">
                        “{p.observation}”
                      </p>
                    )}
                    <a
                      href={`/dashboard/grupos/${group.id}/comprovante/${p.paymentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Ver comprovante →
                    </a>
                  </div>
                  <ReviewActions
                    paymentId={p.paymentId}
                    approveAction={approvePayment.bind(null, group.id)}
                    rejectAction={rejectPayment.bind(null, group.id)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Membros */}
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Membros</h2>
            <p className="text-sm text-muted-foreground">
              {memberCount} {memberCount === 1 ? "membro" : "membros"}
              {isFree && ` de ${FREE_MEMBER_LIMIT} (plano gratuito)`}
            </p>
          </div>
        </div>

        {canAddMember ? (
          <Card>
            <CardContent className="pt-6">
              <MemberForm action={addMember.bind(null, group.id)} />
            </CardContent>
          </Card>
        ) : (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Você atingiu o limite de {FREE_MEMBER_LIMIT} membros do plano
            gratuito. Faça upgrade pro PRO para adicionar mais.
          </p>
        )}

        {memberCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum membro ainda. Adicione o primeiro acima.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Nome</th>
                  <th className="px-4 py-2 font-medium">WhatsApp</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {group.members.map((m) => {
                  const badge = memberStatusBadge(m.status);
                  return (
                    <tr key={m.id} className="border-t border-border">
                      <td className="px-4 py-2 font-medium">{m.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {formatPhoneBR(m.phone)}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <form action={removeMember}>
                          <input type="hidden" name="memberId" value={m.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="xs"
                            className="text-destructive"
                          >
                            Remover
                          </Button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cobranças */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Cobranças</h2>
          <p className="text-sm text-muted-foreground">
            As cobranças recorrentes são geradas automaticamente. Use o avulso
            abaixo só pra rodadas extras (ex: um churrasco fora do padrão).
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cobrança avulsa</CardTitle>
            <CardDescription>
              Gera uma cobrança extra agora, fora da recorrência. Escolha o
              vencimento e o valor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChargeGenerator
              action={generateCharges.bind(null, group.id)}
              defaultAmount={group.defaultAmount.toString()}
            />
          </CardContent>
        </Card>

        {group.charges.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma cobrança gerada ainda.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Membro</th>
                  <th className="px-4 py-2 font-medium">Valor</th>
                  <th className="px-4 py-2 font-medium">Vencimento</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {group.charges.map((c) => {
                  const badge = chargeStatusBadge(c.status, c.dueDate);
                  return (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-4 py-2 font-medium">{c.member.name}</td>
                      <td className="px-4 py-2">
                        {formatBRL(c.amount.toString())}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {formatDate(c.dueDate)}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
