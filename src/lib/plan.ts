import type { PlanCycle } from "@/generated/prisma/client";

// Configuração do plano PRO num lugar só — UI, checkout e admin leem daqui.
// Preço definido pelo Sardinha: R$ 9,90/mês; anual com 2 meses "grátis".
//
// O Mercado Pago cobra recorrência por `frequency` + `frequency_type`. Anual =
// a cada 12 meses (o MP usa "months"/"days", não tem "years").
export type ProPlan = {
  cycle: PlanCycle;
  label: string;
  // Valor cobrado por ciclo, em reais.
  amount: number;
  frequency: number;
  frequencyType: "months";
  // Valor efetivo por mês — usado pra mostrar a economia do anual.
  perMonth: number;
};

export const PRO_PRICING: Record<PlanCycle, ProPlan> = {
  MONTHLY: {
    cycle: "MONTHLY",
    label: "Mensal",
    amount: 9.9,
    frequency: 1,
    frequencyType: "months",
    perMonth: 9.9,
  },
  ANNUAL: {
    cycle: "ANNUAL",
    label: "Anual",
    // 25% de desconto sobre 12x o mensal (9,90 × 12 = 118,80 → 89,10).
    amount: 89.1,
    frequency: 12,
    frequencyType: "months",
    perMonth: 89.1 / 12,
  },
};

// Quanto o anual economiza em relação a 12x o mensal (em %, arredondado).
export const ANNUAL_SAVINGS_PCT = Math.round(
  (1 - PRO_PRICING.ANNUAL.amount / (PRO_PRICING.MONTHLY.amount * 12)) * 100,
);
