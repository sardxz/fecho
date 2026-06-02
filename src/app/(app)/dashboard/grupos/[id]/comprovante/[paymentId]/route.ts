import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProofUrl } from "@/lib/storage";

// Serve o comprovante sob demanda: gera a URL pré-assinada do MinIO só no
// clique e redireciona pra ela. Assim o link no painel nunca "expira na tela"
// (a URL temporária de 5 min só nasce aqui) e o arquivo nunca fica público.
// Valida sessão + ownership (Payment → Charge → Group.ownerId) antes de tudo.
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

  redirect(await getProofUrl(payment.proofUrl));
}
