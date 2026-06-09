import crypto from "node:crypto";
import type { PlanCycle } from "@/generated/prisma/client";
import { PRO_PRICING } from "./plan";

// Cliente do Mercado Pago via API REST (sem SDK — menos peso e tudo auditável).
// Doc: https://www.mercadopago.com.br/developers/pt/reference/subscriptions
//
// SEGURANÇA: o access token é secreto e só existe no servidor. O webhook nunca
// confia no payload recebido — sempre consulta o MP pelo id pra saber o status
// real (ver getPreapproval + a rota /api/webhooks/mercadopago).

const MP_API = "https://api.mercadopago.com";

// Base pública do app — reusa o AUTH_URL (mesma env do Auth.js e do WhatsApp).
const APP_URL = process.env.AUTH_URL ?? "http://localhost:3000";

function accessToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("MP_ACCESS_TOKEN não configurado.");
  return token;
}

// Status possíveis de uma assinatura (preapproval) no MP.
export type PreapprovalStatus =
  | "pending"
  | "authorized"
  | "paused"
  | "cancelled";

export type Preapproval = {
  id: string;
  status: PreapprovalStatus;
  external_reference?: string;
  payer_email?: string;
  init_point?: string;
  next_payment_date?: string;
};

async function mpFetch(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Mercado Pago ${path} falhou (${res.status}): ${JSON.stringify(body)}`,
    );
  }
  return body;
}

// Cria a assinatura (preapproval). Volta com `init_point`: a URL do checkout
// hospedado do MP, pra onde redirecionamos o usuário. Não tocamos em dados de
// cartão — quem coleta é o MP.
export async function createPreapproval(params: {
  userId: string;
  email: string;
  cycle: PlanCycle;
}): Promise<Preapproval> {
  const price = PRO_PRICING[params.cycle];
  return mpFetch("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: `Fechô PRO (${price.label})`,
      // Amarra a assinatura ao nosso usuário — o webhook usa isso pra saber
      // quem virou PRO.
      external_reference: params.userId,
      payer_email: params.email,
      back_url: `${APP_URL}/dashboard/assinatura?status=processing`,
      auto_recurring: {
        frequency: price.frequency,
        frequency_type: price.frequencyType,
        transaction_amount: price.amount,
        currency_id: "BRL",
      },
      status: "pending",
    }),
  }) as Promise<Preapproval>;
}

// Consulta o estado real da assinatura no MP. Fonte da verdade do webhook.
export async function getPreapproval(id: string): Promise<Preapproval> {
  return mpFetch(`/preapproval/${id}`, { method: "GET" }) as Promise<Preapproval>;
}

// Cancela a assinatura no MP (para de cobrar nos próximos ciclos).
export async function cancelPreapproval(id: string): Promise<void> {
  await mpFetch(`/preapproval/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

// Valida a assinatura HMAC que o MP manda no header `x-signature`. Sem isso,
// qualquer um poderia chamar nosso webhook e forjar um "pagamento aprovado".
// Manifesto oficial do MP: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
export function isValidWebhookSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  // Sem segredo configurado, recusamos por padrão (fail-closed).
  if (!secret) return false;

  const { xSignature, xRequestId, dataId } = params;
  if (!xSignature || !dataId) return false;

  // x-signature vem como "ts=<ts>,v1=<hash>".
  const parts: Record<string, string> = {};
  for (const piece of xSignature.split(",")) {
    const [k, v] = piece.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId ?? ""};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  // Comparação em tempo constante (evita timing attack).
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}
