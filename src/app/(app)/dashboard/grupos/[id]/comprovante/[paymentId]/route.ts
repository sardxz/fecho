import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProofObject } from "@/lib/storage";

// Serve o comprovante sob demanda: o Next baixa o arquivo do MinIO (rede
// interna) e repassa pro organizador. O arquivo nunca fica público e o MinIO
// nunca é exposto à internet. Valida sessão + ownership
// (Payment → Charge → Group.ownerId) antes de tocar no storage.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const { id: groupId, paymentId } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: {
      proofUrl: true,
      charge: {
        select: { groupId: true, group: { select: { ownerId: true } } },
      },
    },
  });

  if (
    !payment ||
    payment.charge.groupId !== groupId ||
    payment.charge.group.ownerId !== session.user.id
  ) {
    // Não revela existência: trata como não encontrado.
    return new Response("Não encontrado.", { status: 404 });
  }

  if (!payment.proofUrl) {
    return new Response("Comprovante sem arquivo.", { status: 404 });
  }

  const { body, contentType } = await getProofObject(payment.proofUrl);
  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": contentType ?? "application/octet-stream",
      // Abre no navegador (imagem/PDF) em vez de baixar.
      "Content-Disposition": "inline",
      // Comprovante é dado sensível: não deixa cache em proxy/navegador.
      "Cache-Control": "private, no-store",
    },
  });
}
