// Resumo financeiro de um conjunto de cobranças. "Arrecadado" = cobranças
// pagas; "em aberto" = tudo que não foi pago. Inadimplente = membro com
// cobrança vencida (pendente e vencimento no passado — mesma regra do badge,
// decisão #3). Isolado aqui pra reusar na página do grupo e no dashboard geral
// sem duplicar a regra, e pra manter os componentes puros (Date.now() não pode
// ser chamado direto no render).

export type ChargeForSummary = {
  status: string;
  amount: { toString(): string };
  dueDate: Date;
  memberId: string;
};

export function computeSummary(charges: ChargeForSummary[]) {
  const now = Date.now();
  let collected = 0;
  let outstanding = 0;
  const defaultersSet = new Set<string>();
  for (const c of charges) {
    const amount = Number(c.amount.toString());
    if (c.status === "PAID") {
      collected += amount;
    } else {
      outstanding += amount;
    }
    if (c.status === "PENDING" && c.dueDate.getTime() < now) {
      defaultersSet.add(c.memberId);
    }
  }
  return { collected, outstanding, defaulters: defaultersSet.size };
}
