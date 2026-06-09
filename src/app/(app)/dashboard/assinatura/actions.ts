"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createPreapproval,
  cancelPreapproval,
} from "@/lib/mercadopago";
import type { PlanCycle } from "@/generated/prisma/client";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, plan: true, mpPreapprovalId: true },
  });
  if (!user) redirect("/login");
  return user;
}

// Inicia a assinatura: cria o preapproval no MP e manda o usuário pro checkout
// hospedado. O plano só vira PRO de fato quando o webhook confirmar — aqui só
// guardamos o id e o ciclo como "pendente".
export async function startSubscription(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.plan === "PRO") redirect("/dashboard/assinatura");

  const cycle = String(formData.get("cycle"));
  if (cycle !== "MONTHLY" && cycle !== "ANNUAL") {
    redirect("/dashboard/assinatura?status=erro");
  }

  const pre = await createPreapproval({
    userId: user.id,
    email: user.email,
    cycle: cycle as PlanCycle,
  });

  await db.user.update({
    where: { id: user.id },
    data: { mpPreapprovalId: pre.id, planCycle: cycle as PlanCycle },
  });

  if (!pre.init_point) {
    redirect("/dashboard/assinatura?status=erro");
  }
  // Leva pro checkout do Mercado Pago.
  redirect(pre.init_point);
}

// Cancela a assinatura. Fazemos a baixa pra FREE aqui mesmo (de forma síncrona
// e confiável, já que somos nós que disparamos), em vez de só esperar o
// webhook. Simplificação consciente do MVP: o acesso PRO encerra na hora do
// cancelamento, não no fim do período já pago.
export async function cancelSubscription(): Promise<void> {
  const user = await requireUser();

  if (user.mpPreapprovalId) {
    await cancelPreapproval(user.mpPreapprovalId);
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      plan: "FREE",
      mpPreapprovalId: null,
      planCycle: null,
      planRenewsAt: null,
    },
  });

  revalidatePath("/dashboard/assinatura");
  revalidatePath("/dashboard");
}
