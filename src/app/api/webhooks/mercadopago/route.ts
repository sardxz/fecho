import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getPreapproval, isValidWebhookSignature } from "@/lib/mercadopago";

// Precisa do runtime Node (usa node:crypto na validação da assinatura).
export const runtime = "nodejs";

// Webhook do Mercado Pago: recebe a notificação de mudança na assinatura e
// atualiza o plano do usuário. Princípio: NUNCA confiar no payload — validamos
// a assinatura HMAC e depois consultamos o MP pra saber o status real.
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as {
    type?: string;
    topic?: string;
    data?: { id?: string };
  };

  // O id do recurso e o tipo podem vir na query (?data.id=&type=) ou no corpo.
  const dataId = url.searchParams.get("data.id") ?? body.data?.id ?? null;
  const type =
    url.searchParams.get("type") ??
    url.searchParams.get("topic") ??
    body.type ??
    body.topic ??
    "";

  // 1) Autenticidade: confere a assinatura antes de qualquer coisa.
  if (
    !isValidWebhookSignature({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId,
    })
  ) {
    return new Response("invalid signature", { status: 401 });
  }

  // 2) Só tratamos eventos de assinatura; o resto respondemos 200 e ignoramos
  //    (200 evita que o MP fique reenviando notificação que não nos interessa).
  const isSubscription =
    type === "subscription_preapproval" || type === "preapproval";
  if (!isSubscription || !dataId) {
    return new Response("ignored", { status: 200 });
  }

  // 3) Fonte da verdade: consulta o MP pelo id.
  const pre = await getPreapproval(dataId);
  const userId = pre.external_reference;
  if (!userId) return new Response("no external_reference", { status: 200 });

  // 4) Aplica o estado. "authorized" = assinatura ativa → PRO. Qualquer outro
  //    (paused/cancelled/pending) → volta/segue FREE. Idempotente: rodar de
  //    novo com o mesmo status não muda nada. updateMany não estoura se o
  //    usuário sumiu.
  const isActive = pre.status === "authorized";
  await db.user.updateMany({
    where: { id: userId },
    data: {
      plan: isActive ? "PRO" : "FREE",
      mpPreapprovalId: pre.id,
      planRenewsAt:
        isActive && pre.next_payment_date
          ? new Date(pre.next_payment_date)
          : null,
      ...(isActive ? {} : { planCycle: null }),
    },
  });

  return new Response("ok", { status: 200 });
}
