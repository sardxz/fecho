import Link from "next/link";
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
import { formatBRL, frequencyLabels } from "@/lib/format";

export const metadata = {
  title: "Dashboard — Fechô",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [user, groups] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { plan: true } }),
    db.group.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { members: true } } },
    }),
  ]);

  // Limite freemium: FREE = 1 grupo. PRO = ilimitado.
  const canCreate = user?.plan === "PRO" || groups.length < 1;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Seus grupos</h1>
          <p className="text-muted-foreground">
            Crie um grupo pra começar a organizar pagamentos.
          </p>
        </div>
        {canCreate ? (
          <Button render={<Link href="/dashboard/grupos/novo" />}>
            Criar grupo
          </Button>
        ) : (
          <Button disabled>Criar grupo</Button>
        )}
      </header>

      {!canCreate && (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Você atingiu o limite do plano gratuito (1 grupo). Faça upgrade pro
          PRO para criar grupos ilimitados.
        </p>
      )}

      {groups.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Nenhum grupo por aqui ainda</CardTitle>
            <CardDescription>
              Crie seu primeiro grupo pra cadastrar membros e gerar cobranças.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/dashboard/grupos/novo" />}>
              Criar meu primeiro grupo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <Link key={group.id} href={`/dashboard/grupos/${group.id}`}>
              <Card className="h-full transition-colors hover:border-ring">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="truncate">{group.name}</CardTitle>
                    <Badge
                      variant={
                        group.status === "ACTIVE" ? "default" : "secondary"
                      }
                    >
                      {group.status === "ACTIVE" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  {group.description && (
                    <CardDescription className="truncate">
                      {group.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {formatBRL(group.defaultAmount.toString())}
                  </span>
                  <span>{frequencyLabels[group.frequency]}</span>
                  <span>
                    {group._count.members}{" "}
                    {group._count.members === 1 ? "membro" : "membros"}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
