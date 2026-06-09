"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { groupSchema } from "@/lib/validations/group";
import { slugify } from "@/lib/slug";

export type GroupFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  // Sinaliza pra UI mostrar o CTA "Assinar PRO" (limite do plano gratuito).
  upgrade?: boolean;
};

const FREE_GROUP_LIMIT = 1;

// Garante usuário logado e devolve o id (ou manda pro login).
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

// Converte os erros do Zod no formato { campo: [mensagens] } sem depender
// de APIs que mudam entre versões do Zod.
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

function readForm(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description"),
    defaultAmount: formData.get("defaultAmount"),
    frequency: formData.get("frequency"),
    weekday: formData.get("weekday"),
    dueDay: formData.get("dueDay"),
    pixKey: formData.get("pixKey"),
  };
}

// Mantém só o campo de dia que importa pra frequência; zera o resto.
function recurrenceFields(data: {
  frequency: string;
  weekday?: number;
  dueDay?: number;
}): { weekday: number | null; dueDay: number | null } {
  return {
    weekday: data.frequency === "WEEKLY" ? (data.weekday ?? null) : null,
    dueDay: data.frequency === "MONTHLY" ? (data.dueDay ?? null) : null,
  };
}

export async function createGroup(
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const userId = await requireUserId();

  const parsed = groupSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  // Limite freemium: validado no servidor, nunca só escondendo o botão.
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (user?.plan === "FREE") {
    const count = await db.group.count({ where: { ownerId: userId } });
    if (count >= FREE_GROUP_LIMIT) {
      return {
        error:
          "No plano gratuito você pode ter 1 grupo. Faça upgrade pro PRO para criar mais.",
        upgrade: true,
      };
    }
  }

  const data = parsed.data;
  const group = await db.group.create({
    data: {
      ownerId: userId,
      name: data.name,
      description: data.description || null,
      defaultAmount: data.defaultAmount,
      frequency: data.frequency,
      ...recurrenceFields(data),
      pixKey: data.pixKey,
      slug: slugify(data.name),
    },
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/grupos/${group.id}`);
}

export async function updateGroup(
  groupId: string,
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const userId = await requireUserId();

  // Ownership: só o dono edita.
  const existing = await db.group.findUnique({
    where: { id: groupId },
    select: { ownerId: true },
  });
  if (!existing || existing.ownerId !== userId) {
    return { error: "Grupo não encontrado." };
  }

  const parsed = groupSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const data = parsed.data;
  // O slug não muda na edição: o link público já pode ter sido compartilhado.
  await db.group.update({
    where: { id: groupId },
    data: {
      name: data.name,
      description: data.description || null,
      defaultAmount: data.defaultAmount,
      frequency: data.frequency,
      ...recurrenceFields(data),
      pixKey: data.pixKey,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/grupos/${groupId}`);
  return {};
}

// Ativa/inativa o grupo (não deletamos nesta etapa — protege dados de
// membros/cobranças que possam estar amarrados).
export async function toggleGroupStatus(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const groupId = String(formData.get("id") ?? "");

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { ownerId: true, status: true },
  });
  if (!group || group.ownerId !== userId) return;

  await db.group.update({
    where: { id: groupId },
    data: { status: group.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/grupos/${groupId}`);
}
