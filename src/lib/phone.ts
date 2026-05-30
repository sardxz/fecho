// Telefone normalizado em E.164 para o Brasil (decisão arquitetural #7).
// Aceita formatos comuns: "(11) 99999-9999", "11999999999", "+55 11 99999-9999".
// Retorna "+5511999999999" ou null se inválido.
export function normalizePhoneBR(input: string): string | null {
  let d = input.replace(/\D/g, "");

  // Tira o código do país se já veio (55 + DDD + número = 12 ou 13 dígitos).
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) {
    d = d.slice(2);
  }

  // Sobra DDD (2) + número (8 fixo ou 9 celular) = 10 ou 11 dígitos.
  if (d.length === 10 || d.length === 11) {
    return `+55${d}`;
  }

  return null;
}

// Formata um E.164 brasileiro para exibição: "+5511999999999" → "(11) 99999-9999".
export function formatPhoneBR(e164: string): string {
  const d = e164.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return e164;
}
