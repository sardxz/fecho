"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberSchema, generateChargesSchema } from "@/lib/validations/member";
import { rejectionReasonSchema } from "@/lib/validations/proof";
import { normalizePhoneBR } from "@/lib/phone";
import { generateChargesForGroup } from "@/lib/charges";

export type MemberFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  ok?: boolean;
  // Sinaliza pra UI mostrar o CTA "Assinar PRO" (limite do plano gratuito).
  upgrade?: boolean;
};

export type ChargeFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  created?: number;
};

export type ReviewState = {
  error?: string;
  ok?: boolean;
};

const FREE_MEMBER_LIMIT = 10;

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  return session.user.id;
}

function toFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

// Confirma que o grupo existe e pertence ao usuário logado.
async function assertOwnsGroup(groupId: string, userId: string) {
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { ownerId: true },
  });
  return !!group && group.ownerId === userId;
}

export async function addMember(
  groupId: string,
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  const userId = await requireUserId();
  if (!(await assertOwnsGroup(groupId, userId))) {
    return { error: "Grupo não encontrado." };
  }

  const parsed = memberSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const phone = normalizePhoneBR(parsed.data.phone);
  if (!phone) {
    return { fieldErrors: { phone: ["Telefone inválido. Use DDD + número."] } };
  }

  // Limite freemium: 10 membros ativos por grupo no FREE — checado no servidor.
  const owner = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (owner?.plan === "FREE") {
    const count = await db.member.count({
      where: { groupId, status: { not: "REMOVED" } },
    });
    if (count >= FREE_MEMBER_LIMIT) {
      return {
        error: `No plano gratuito cada grupo tem até ${FREE_MEMBER_LIMIT} membros. Faça upgrade pro PRO para adicionar mais.`,
        upgrade: true,
      };
    }
  }

  await db.member.create({
    data: {
      groupId,
      name: parsed.data.name,
      phone,
      email: parsed.data.email || null,
    },
  });

  revalidatePath(`/dashboard/grupos/${groupId}`);
  return { ok: true };
}

// Remoção é soft (status REMOVED): preserva o histórico de cobranças do membro.
export async function removeMember(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const memberId = String(formData.get("memberId") ?? "");

  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { groupId: true, group: { select: { ownerId: true } } },
  });
  if (!member || member.group.ownerId !== userId) return;

  await db.member.update({
    where: { id: memberId },
    data: { status: "REMOVED" },
  });

  revalidatePath(`/dashboard/grupos/${member.groupId}`);
}

export async function generateCharges(
  groupId: string,
  _prev: ChargeFormState,
  formData: FormData,
): Promise<ChargeFormState> {
  const userId = await requireUserId();
  if (!(await assertOwnsGroup(groupId, userId))) {
    return { error: "Grupo não encontrado." };
  }

  const parsed = generateChargesSchema.safeParse({
    dueDate: formData.get("dueDate"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }
  const { dueDate, amount } = parsed.data;

  const created = await generateChargesForGroup(groupId, dueDate, amount);
  if (created === 0) {
    return {
      error:
        "Nada gerado: ou não há membros ativos, ou todos já têm cobrança nessa data.",
    };
  }

  revalidatePath(`/dashboard/grupos/${groupId}`);
  return { created };
}

// Carrega um pagamento garantindo que ele pertence a um grupo do usuário logado.
// Devolve null se não existir ou não for do dono — evita aprovar/recusar
// comprovante de grupo alheio.
async function loadOwnedPayment(paymentId: string, userId: string) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      status: true,
      charge: { select: { id: true, groupId: true, group: { select: { ownerId: true } } } },
    },
  });
  if (!payment || payment.charge.group.ownerId !== userId) return null;
  return payment;
}

// Aprova um comprovante: pagamento → APPROVED (com auditoria) e cobrança → PAID.
export async function approvePayment(
  groupId: string,
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const userId = await requireUserId();
  const paymentId = String(formData.get("paymentId") ?? "");

  const payment = await loadOwnedPayment(paymentId, userId);
  if (!payment || payment.charge.groupId !== groupId) {
    return { error: "Comprovante não encontrado." };
  }
  // Guarda de corrida: só age se ainda está aguardando revisão.
  if (payment.status !== "PENDING_REVIEW") {
    return { error: "Esse comprovante já foi revisado." };
  }

  const now = new Date();
  await db.$transaction([
    db.payment.update({
      where: { id: payment.id },
      data: {
        status: "APPROVED",
        approvedBy: userId,
        approvedAt: now,
        paidAt: now,
      },
    }),
    db.charge.update({
      where: { id: payment.charge.id },
      data: { status: "PAID" },
    }),
  ]);

  revalidatePath(`/dashboard/grupos/${groupId}`);
  return { ok: true };
}

// Recusa um comprovante: pagamento → REJECTED (com motivo) e cobrança →
// REJECTED. A cobrança volta a aceitar reenvio (submitProof permite REJECTED).
export async function rejectPayment(
  groupId: string,
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const userId = await requireUserId();
  const paymentId = String(formData.get("paymentId") ?? "");

  const parsed = rejectionReasonSchema.safeParse(formData.get("reason"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Motivo inválido." };
  }

  const payment = await loadOwnedPayment(paymentId, userId);
  if (!payment || payment.charge.groupId !== groupId) {
    return { error: "Comprovante não encontrado." };
  }
  if (payment.status !== "PENDING_REVIEW") {
    return { error: "Esse comprovante já foi revisado." };
  }

  await db.$transaction([
    db.payment.update({
      where: { id: payment.id },
      data: { status: "REJECTED", rejectionReason: parsed.data },
    }),
    db.charge.update({
      where: { id: payment.charge.id },
      data: { status: "REJECTED" },
    }),
  ]);

  revalidatePath(`/dashboard/grupos/${groupId}`);
  return { ok: true };
}
