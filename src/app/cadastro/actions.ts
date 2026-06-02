"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { signupSchema } from "@/lib/validations/auth";

export type SignupState = { error?: string };

// Cria a conta com a senha já "hasheada" (bcrypt, custo 12) e loga o usuário
// na sequência. A senha original nunca é gravada nem logada.
export async function signup(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe uma conta com esse e-mail. Tente entrar." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.create({ data: { name, email, passwordHash } });

  // Loga automaticamente após cadastrar. signIn lança o redirect pro dashboard
  // (NEXT_REDIRECT), por isso ele NÃO pode ficar dentro de try/catch aqui.
  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  return {};
}
