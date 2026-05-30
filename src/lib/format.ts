export function formatBRL(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const frequencyLabels: Record<string, string> = {
  ONCE: "Única",
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
};

export const weekdayNames = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

// Descreve a recorrência do grupo para exibição.
export function describeRecurrence(
  frequency: string,
  weekday: number | null,
  dueDay: number | null,
): string {
  if (frequency === "WEEKLY") {
    if (weekday == null) return "Recorrência não configurada — edite o grupo";
    // domingo (0) e sábado (6) são masculinos; os "-feira" são femininos.
    const artigo = weekday === 0 || weekday === 6 ? "todo" : "toda";
    return `Cobrança automática ${artigo} ${weekdayNames[weekday]}`;
  }
  if (frequency === "MONTHLY") {
    return dueDay != null
      ? `Cobrança automática todo dia ${dueDay}`
      : "Recorrência não configurada — edite o grupo";
  }
  return "Sem recorrência (apenas cobrança avulsa)";
}
