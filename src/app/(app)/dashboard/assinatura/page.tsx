import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import { PRO_PRICING, ANNUAL_SAVINGS_PCT } from "@/lib/plan";
import { startSubscription, cancelSubscription } from "./actions";

export const metadata = {
  title: "Plano — Fechô",
};

const PRO_PERKS = [
  "Grupos ilimitados",
  "Membros ilimitados por grupo",
  "Cobranças recorrentes automáticas",
  "Cobrança no WhatsApp com 1 clique",
];

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { status } = await searchParams;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, planCycle: true, planRenewsAt: true },
  });

  const isPro = user?.plan === "PRO";

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Seu plano</h1>
        <p className="text-muted-foreground">
          {isPro
            ? "Você é PRO. Obrigado por apoiar o Fechô!"
            : "Faça upgrade pro PRO e tire os limites do plano gratuito."}
        </p>
      </header>

      {status === "processing" && (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Recebemos seu pagamento e estamos confirmando com o Mercado Pago. Pode
          levar alguns instantes até seu plano virar PRO — atualize a página em
          seguida.
        </p>
      )}
      {status === "erro" && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Não foi possível iniciar a assinatura. Tente de novo em instantes.
        </p>
      )}

      {isPro ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Plano PRO</CardTitle>
              <Badge>Ativo</Badge>
            </div>
            <CardDescription>
              {user?.planCycle
                ? `Ciclo ${PRO_PRICING[user.planCycle].label.toLowerCase()} · ${formatBRL(
                    PRO_PRICING[user.planCycle].amount,
                  )}`
                : "Assinatura ativa"}
              {user?.planRenewsAt
                ? ` · renova em ${user.planRenewsAt.toLocaleDateString("pt-BR")}`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="grid gap-1.5 text-sm text-muted-foreground">
              {PRO_PERKS.map((perk) => (
                <li key={perk}>✓ {perk}</li>
              ))}
            </ul>
            <form action={cancelSubscription}>
              <Button variant="destructive" size="sm" type="submit">
                Cancelar assinatura
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">
              Ao cancelar, você volta pro plano gratuito na hora e o Mercado Pago
              para de cobrar nos próximos ciclos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          <PlanCard cycle="MONTHLY" />
          <PlanCard cycle="ANNUAL" highlight />
        </section>
      )}
    </div>
  );
}

function PlanCard({
  cycle,
  highlight = false,
}: {
  cycle: "MONTHLY" | "ANNUAL";
  highlight?: boolean;
}) {
  const plan = PRO_PRICING[cycle];
  const isAnnual = cycle === "ANNUAL";

  return (
    <Card className={highlight ? "border-violet-300" : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>PRO {plan.label}</CardTitle>
          {isAnnual && <Badge>Economize {ANNUAL_SAVINGS_PCT}%</Badge>}
        </div>
        <CardDescription>
          <span className="text-2xl font-semibold text-foreground">
            {formatBRL(plan.amount)}
          </span>{" "}
          {isAnnual ? "por ano" : "por mês"}
          {isAnnual && (
            <span className="block text-xs">
              equivale a {formatBRL(plan.perMonth)}/mês
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={startSubscription}>
          <input type="hidden" name="cycle" value={cycle} />
          <Button
            type="submit"
            variant={highlight ? "default" : "outline"}
            className="w-full"
          >
            Assinar {plan.label.toLowerCase()}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
