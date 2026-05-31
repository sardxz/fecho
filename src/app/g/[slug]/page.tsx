import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBRL, describeRecurrence } from "@/lib/format";
import { CopyPix } from "./copy-pix";
import { ProofForm } from "./proof-form";
import { submitProof } from "./actions";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

// Status da cobrança na ótica do participante. "Vencido" é on-the-fly
// (decisão #3). `canSend` libera o envio de comprovante.
function chargeView(
  status: string,
  dueDate: Date,
): { label: string; variant: BadgeVariant; canSend: boolean } {
  if (status === "PENDING" && dueDate.getTime() < Date.now()) {
    return { label: "Vencido", variant: "destructive", canSend: true };
  }
  switch (status) {
    case "PENDING":
      return { label: "Aguardando pagamento", variant: "outline", canSend: true };
    case "REJECTED":
      return { label: "Comprovante recusado", variant: "destructive", canSend: true };
    case "PROOF_SENT":
      return { label: "Comprovante em análise", variant: "secondary", canSend: false };
    case "PAID":
      return { label: "Pago", variant: "default", canSend: false };
    default:
      return { label: status, variant: "outline", canSend: false };
  }
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const group = await db.group.findUnique({
    where: { slug },
    select: { name: true, status: true },
  });
  if (!group || group.status !== "ACTIVE") {
    return { title: "Grupo não encontrado — Fechô" };
  }
  return { title: `${group.name} — Fechô` };
}

export default async function PublicGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { slug } = await params;
  const { m: token } = await searchParams;

  const group = await db.group.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      description: true,
      defaultAmount: true,
      frequency: true,
      weekday: true,
      dueDay: true,
      pixKey: true,
      status: true,
    },
  });

  // Grupo inexistente ou inativo → página neutra (não vaza se existe ou não).
  if (!group || group.status !== "ACTIVE") {
    return (
      <Shell>
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Grupo não encontrado</CardTitle>
            <CardDescription>
              Esse link pode estar errado ou o grupo não está mais ativo. Peça o
              link atualizado ao organizador.
            </CardDescription>
          </CardHeader>
        </Card>
      </Shell>
    );
  }

  // Resolve o membro pelo token do link. Inválido/de outro grupo → trata como
  // ausente (não diferencia, por privacidade).
  const member = token
    ? await db.member.findUnique({
        where: { publicToken: token },
        select: {
          id: true,
          name: true,
          status: true,
          groupId: true,
          charges: {
            orderBy: { dueDate: "desc" },
            select: { id: true, amount: true, dueDate: true, status: true },
          },
        },
      })
    : null;

  const validMember =
    member && member.groupId === group.id && member.status !== "REMOVED"
      ? member
      : null;

  return (
    <Shell>
      {/* Cabeçalho do grupo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{group.name}</CardTitle>
          {group.description && (
            <CardDescription>{group.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              Valor:{" "}
              <span className="font-medium text-foreground">
                {formatBRL(group.defaultAmount.toString())}
              </span>
            </span>
            <span>
              {describeRecurrence(group.frequency, group.weekday, group.dueDay)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Chave Pix</p>
              <p className="truncate font-mono text-sm">{group.pixKey}</p>
            </div>
            <CopyPix pixKey={group.pixKey} />
          </div>
        </CardContent>
      </Card>

      {/* Área do participante */}
      {!validMember ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pague sua parte</CardTitle>
            <CardDescription>
              Abra o link pessoal que o organizador te enviou no WhatsApp para
              ver sua cobrança e enviar o comprovante. Sem o link, peça um novo a
              ele.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Olá, {validMember.name.split(" ")[0]}
            </h2>
            <p className="text-sm text-muted-foreground">
              Suas cobranças neste grupo.
            </p>
          </div>

          {validMember.charges.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Você ainda não tem cobranças aqui.
              </CardContent>
            </Card>
          ) : (
            validMember.charges.map((c) => {
              const view = chargeView(c.status, c.dueDate);
              return (
                <Card key={c.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        {formatBRL(c.amount.toString())}
                      </CardTitle>
                      <Badge variant={view.variant}>{view.label}</Badge>
                    </div>
                    <CardDescription>
                      Vencimento: {formatDate(c.dueDate)}
                    </CardDescription>
                  </CardHeader>
                  {view.canSend && (
                    <CardContent>
                      <ProofForm
                        action={submitProof.bind(null, slug, token!)}
                        chargeId={c.id}
                      />
                    </CardContent>
                  )}
                  {c.status === "PROOF_SENT" && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Recebemos seu comprovante. Assim que o organizador
                        conferir, o status muda aqui.
                      </p>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </section>
      )}
    </Shell>
  );
}

// Casca visual leve da página pública (fora do dashboard).
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Link href="/">
            <Logo />
          </Link>
        </div>
        {children}
        <p className="text-center text-xs text-muted-foreground">
          Organizado com Fechô.
        </p>
      </div>
    </div>
  );
}
