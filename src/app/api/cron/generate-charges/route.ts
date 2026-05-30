import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dueDateForToday, generateChargesForGroup } from "@/lib/charges";

// Chamado 1x/dia pela VPS (crontab) com o header:
//   Authorization: Bearer <CRON_SECRET>
// Gera as cobranças recorrentes dos grupos que vencem hoje (fuso São Paulo).
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const groups = await db.group.findMany({
    where: { status: "ACTIVE", frequency: { in: ["WEEKLY", "MONTHLY"] } },
    select: {
      id: true,
      frequency: true,
      weekday: true,
      dueDay: true,
      defaultAmount: true,
    },
  });

  const now = new Date();
  let totalCharges = 0;
  let groupsHit = 0;

  for (const g of groups) {
    const dueDate = dueDateForToday(g, now);
    if (!dueDate) continue;
    const created = await generateChargesForGroup(
      g.id,
      dueDate,
      Number(g.defaultAmount),
    );
    if (created > 0) {
      groupsHit++;
      totalCharges += created;
    }
  }

  return NextResponse.json({ ok: true, groupsHit, totalCharges });
}
