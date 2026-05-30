import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GroupForm } from "../../group-form";
import { updateGroup, toggleGroupStatus } from "../../actions";

export default async function EditGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const group = await db.group.findUnique({ where: { id } });
  // Ownership: grupo inexistente ou de outro dono → 404 (não vaza existência).
  if (!group || group.ownerId !== session.user.id) notFound();

  const isActive = group.status === "ACTIVE";

  const defaults = {
    name: group.name,
    description: group.description,
    defaultAmount: group.defaultAmount.toString(),
    frequency: group.frequency,
    weekday: group.weekday,
    dueDay: group.dueDay,
    pixKey: group.pixKey,
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Editar grupo
          </h1>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Ativo" : "Inativo"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          <Link
            href={`/dashboard/grupos/${group.id}`}
            className="underline underline-offset-4 hover:text-foreground"
          >
            ← Voltar ao painel do grupo
          </Link>
        </p>
        <form action={toggleGroupStatus}>
          <input type="hidden" name="id" value={group.id} />
          <Button
            type="submit"
            variant={isActive ? "ghost" : "secondary"}
            size="sm"
          >
            {isActive ? "Inativar grupo" : "Reativar grupo"}
          </Button>
        </form>
      </header>

      <GroupForm
        action={updateGroup.bind(null, group.id)}
        defaultValues={defaults}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
