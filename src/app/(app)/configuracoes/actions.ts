"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  setPasswordSchema,
  changePasswordSchema,
} from "@/lib/validations/auth";

export type PasswordFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  ok?: boolean;
};

// Define ou altera a senha do usuário logado. O usuário vem SEMPRE da sessão
// (auth()), nunca de input do cliente — ninguém troca a senha de outra conta.
// O fluxo é decidido pelo passwordHash atual no banco, não por um campo do
// formulário: conta sem senha (Google/magic link) define direto; conta com
// senha precisa provar que é o dono informando a senha atual.
export async function updatePassword(
  _prev: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true },
  });
  if (!user) {
    return { error: "Conta não encontrada." };
  }

  const hasPassword = !!user.passwordHash;

  // Validação do formato (mín. 8, confirmação confere). Os campos exigidos
  // mudam conforme já existir senha ou não.
  if (hasPassword) {
    const parsed = changePasswordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    // Confirma posse da conta antes de trocar. Mensagem genérica no campo.
    const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash!);
    if (!ok) {
      return { fieldErrors: { currentPassword: ["Senha atual incorreta."] } };
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await db.user.update({ where: { id: user.id }, data: { passwordHash } });
  } else {
    const parsed = setPasswordSchema.safeParse({
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await db.user.update({ where: { id: user.id }, data: { passwordHash } });
  }

  // Atenção: a sessão é JWT (stateless) — trocar a senha NÃO invalida tokens
  // já emitidos. "Sair de outros dispositivos" exigiria sessão no banco, que
  // foi descartada de propósito no MVP.
  revalidatePath("/configuracoes");
  return { ok: true };
}
