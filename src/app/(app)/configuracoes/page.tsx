import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PasswordForm } from "./password-form";

export const metadata = {
  title: "Configurações da conta — Fechô",
};

export default async function ConfiguracoesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // hasPassword decide o fluxo da tela: quem entrou por Google/magic link
  // ainda não tem senha e vê "Definir senha" (sem pedir a atual).
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  const hasPassword = !!user?.passwordHash;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Configurações da conta
        </h1>
        <p className="text-muted-foreground">
          {hasPassword
            ? "Altere a senha que você usa pra entrar com e-mail."
            : "Defina uma senha pra também poder entrar com e-mail, além do Google ou link mágico."}
        </p>
      </header>

      <PasswordForm hasPassword={hasPassword} />
    </div>
  );
}
