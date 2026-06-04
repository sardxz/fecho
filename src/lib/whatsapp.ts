import { formatBRL } from "@/lib/format";

// Base pública do app. Em dev é localhost:3000; em produção, fechoapp.com.br.
// Reusa o AUTH_URL que o Auth.js já exige, pra não criar outra env.
const APP_URL = process.env.AUTH_URL ?? "http://localhost:3000";

// Link pessoal do participante (decisão #6): /g/[slug]?m=[token]. É o mesmo
// token que o organizador já compartilha — nada de novo vaza aqui.
export function publicMemberUrl(slug: string, token: string): string {
  return `${APP_URL}/g/${slug}?m=${token}`;
}

// Monta o link wa.me com a mensagem de cobrança pronta. WhatsApp aceita o
// número só com dígitos e DDI (sem "+"), e usa *asteriscos* pra negrito.
export function whatsappChargeLink(params: {
  name: string;
  groupName: string;
  amount: number | string;
  phone: string; // E.164, ex: +5511999999999
  slug: string;
  token: string;
}): string {
  const firstName = params.name.split(" ")[0];
  const link = publicMemberUrl(params.slug, params.token);
  const message =
    `Oi, ${firstName}! Sua cobrança no grupo *${params.groupName}* está ` +
    `pendente. Valor: *${formatBRL(params.amount)}*. Pra acertar é só ` +
    `acessar: ${link}`;
  const phoneDigits = params.phone.replace(/\D/g, "");
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}
