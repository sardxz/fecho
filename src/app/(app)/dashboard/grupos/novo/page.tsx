import { GroupForm } from "../group-form";
import { createGroup } from "../actions";

export const metadata = {
  title: "Novo grupo — Fechô",
};

export default function NovoGrupoPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Novo grupo</h1>
        <p className="text-muted-foreground">
          Preencha os dados pra começar a organizar os pagamentos do grupo.
        </p>
      </header>

      <GroupForm action={createGroup} submitLabel="Criar grupo" />
    </div>
  );
}
