import { db } from "./db";

// Motor único de geração de cobranças. Usado pela porta manual (avulsa) e
// pela automática (cron). Idempotente: nunca duplica para o mesmo
// membro/vencimento. Retorna quantas cobranças criou.
export async function generateChargesForGroup(
  groupId: string,
  dueDate: Date,
  amount: number,
): Promise<number> {
  const members = await db.member.findMany({
    where: { groupId, status: { not: "REMOVED" } },
    select: { id: true },
  });
  if (members.length === 0) return 0;

  const existing = await db.charge.findMany({
    where: { groupId, dueDate, memberId: { in: members.map((m) => m.id) } },
    select: { memberId: true },
  });
  const already = new Set(existing.map((c) => c.memberId));
  const toCreate = members.filter((m) => !already.has(m.id));
  if (toCreate.length === 0) return 0;

  await db.charge.createMany({
    data: toCreate.map((m) => ({ groupId, memberId: m.id, amount, dueDate })),
  });
  return toCreate.length;
}

// Decide se um grupo deve gerar cobrança hoje (no fuso de São Paulo) e devolve
// o vencimento (meia-noite UTC do dia), ou null se não for o dia.
export function dueDateForToday(
  group: { frequency: string; weekday: number | null; dueDay: number | null },
  now: Date = new Date(),
): Date | null {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // "YYYY-MM-DD"
  const [y, m, d] = parts.split("-").map(Number);

  const todayUTC = new Date(Date.UTC(y, m - 1, d));
  const weekday = todayUTC.getUTCDay(); // 0=domingo
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const isLastDayOfMonth = d === daysInMonth;

  if (group.frequency === "WEEKLY" && group.weekday != null) {
    return group.weekday === weekday ? todayUTC : null;
  }
  if (group.frequency === "MONTHLY" && group.dueDay != null) {
    // Dia configurado além do fim do mês (ex: 31 em fevereiro) → último dia.
    const matches =
      group.dueDay === d || (group.dueDay > daysInMonth && isLastDayOfMonth);
    return matches ? todayUTC : null;
  }
  return null;
}
