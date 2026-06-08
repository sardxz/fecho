import { db } from "./db";

// Métricas do painel admin, agregadas direto do banco. Tudo em paralelo pra
// uma única ida ao Postgres. Números de negócio (cadastros, grupos, cobranças);
// acessos/geolocalização ficam no Umami (analytics à parte), não aqui.

export type DayCount = { day: string; count: number };

function lastNDays(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1));
  return d;
}

// Agrupa datas por dia (YYYY-MM-DD) e preenche os dias sem cadastro com 0,
// pra o gráfico ter a série contínua dos últimos `days` dias.
function bucketByDay(dates: Date[], days: number): DayCount[] {
  const counts = new Map<string, number>();
  for (const d of dates) {
    const key = d.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: DayCount[] = [];
  const start = lastNDays(days);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, count: counts.get(key) ?? 0 });
  }
  return out;
}

export async function getAdminStats() {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers7d,
    newUsers30d,
    freeUsers,
    proUsers,
    usersWithPassword,
    usersWithGoogle,
    totalGroups,
    activeGroups,
    groupsByFreq,
    totalMembers,
    chargesByStatus,
    collectedAgg,
    outstandingAgg,
    pendingReviews,
    overdueCharges,
    recentUsers,
    topGroups,
    signupDates,
    groupDates,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: d7 } } }),
    db.user.count({ where: { createdAt: { gte: d30 } } }),
    db.user.count({ where: { plan: "FREE" } }),
    db.user.count({ where: { plan: "PRO" } }),
    db.user.count({ where: { passwordHash: { not: null } } }),
    db.user.count({ where: { accounts: { some: { provider: "google" } } } }),
    db.group.count(),
    db.group.count({ where: { status: "ACTIVE" } }),
    db.group.groupBy({ by: ["frequency"], _count: { _all: true } }),
    db.member.count(),
    db.charge.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { amount: true },
    }),
    db.charge.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
    db.charge.aggregate({
      _sum: { amount: true },
      where: { status: { not: "PAID" } },
    }),
    db.payment.count({ where: { status: "PENDING_REVIEW" } }),
    // Inadimplentes: membros distintos com cobrança pendente já vencida
    // (mesma regra do resumo do grupo, decisão #3).
    db.charge.findMany({
      where: { status: "PENDING", dueDate: { lt: now } },
      select: { memberId: true },
      distinct: ["memberId"],
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, email: true, plan: true, createdAt: true },
    }),
    db.group.findMany({
      orderBy: { members: { _count: "desc" } },
      take: 8,
      select: {
        id: true,
        name: true,
        status: true,
        _count: { select: { members: true } },
      },
    }),
    db.user.findMany({
      where: { createdAt: { gte: d30 } },
      select: { createdAt: true },
    }),
    db.group.findMany({
      where: { createdAt: { gte: d30 } },
      select: { createdAt: true },
    }),
  ]);

  const freqMap: Record<string, number> = { ONCE: 0, WEEKLY: 0, MONTHLY: 0 };
  for (const row of groupsByFreq) freqMap[row.frequency] = row._count._all;

  const chargeStatus: Record<string, { count: number; sum: number }> = {};
  let totalCharges = 0;
  for (const row of chargesByStatus) {
    const count = row._count._all;
    totalCharges += count;
    chargeStatus[row.status] = {
      count,
      sum: Number(row._sum.amount ?? 0),
    };
  }

  return {
    users: {
      total: totalUsers,
      new7d: newUsers7d,
      new30d: newUsers30d,
      free: freeUsers,
      pro: proUsers,
      withPassword: usersWithPassword,
      withGoogle: usersWithGoogle,
    },
    groups: {
      total: totalGroups,
      active: activeGroups,
      inactive: totalGroups - activeGroups,
      byFreq: freqMap,
    },
    members: { total: totalMembers },
    charges: {
      total: totalCharges,
      byStatus: chargeStatus,
      collected: Number(collectedAgg._sum.amount ?? 0),
      outstanding: Number(outstandingAgg._sum.amount ?? 0),
      defaulters: overdueCharges.length,
    },
    payments: { pendingReview: pendingReviews },
    signupsByDay: bucketByDay(
      signupDates.map((u) => u.createdAt),
      30,
    ),
    groupsByDay: bucketByDay(
      groupDates.map((g) => g.createdAt),
      30,
    ),
    recentUsers,
    topGroups: topGroups.map((g) => ({
      id: g.id,
      name: g.name,
      status: g.status,
      memberCount: g._count.members,
    })),
  };
}

export type AdminStats = Awaited<ReturnType<typeof getAdminStats>>;
