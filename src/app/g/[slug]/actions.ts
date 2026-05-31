"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { uploadProof } from "@/lib/storage";
import {
  MAX_PROOF_BYTES,
  ALLOWED_PROOF_TYPES,
  proofObservationSchema,
} from "@/lib/validations/proof";

export type ProofFormState = {
  error?: string;
  ok?: boolean;
};

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

// Envio de comprovante pela página pública. NÃO há login aqui: a autorização
// vem do publicToken do membro, que funciona como chave de acesso. A action só
// aceita o envio se o token resolve um membro ativo, o grupo (slug) confere e
// a cobrança pertence a esse membro. Assim ninguém envia comprovante no nome
// de outro nem em grupo alheio.
export async function submitProof(
  slug: string,
  token: string,
  _prev: ProofFormState,
  formData: FormData,
): Promise<ProofFormState> {
  const chargeId = String(formData.get("chargeId") ?? "");
  const file = formData.get("file");

  // Resolve o membro pelo token e amarra grupo + cobrança numa query só.
  const member = await db.member.findUnique({
    where: { publicToken: token },
    select: { id: true, status: true, group: { select: { id: true, slug: true, status: true } } },
  });

  if (
    !member ||
    member.status === "REMOVED" ||
    member.group.slug !== slug ||
    member.group.status !== "ACTIVE"
  ) {
    return { error: "Link inválido ou expirado. Peça um novo ao organizador." };
  }

  const charge = await db.charge.findUnique({
    where: { id: chargeId },
    select: { id: true, memberId: true, status: true },
  });
  if (!charge || charge.memberId !== member.id) {
    return { error: "Cobrança não encontrada." };
  }
  // Só aceita comprovante de cobrança em aberto (pendente/vencida) ou recusada
  // (reenvio). Já paga ou já em análise não recebe novo envio.
  if (charge.status === "PAID") {
    return { error: "Essa cobrança já está paga." };
  }
  if (charge.status === "PROOF_SENT") {
    return { error: "Já existe um comprovante em análise para essa cobrança." };
  }

  // Validação do arquivo (imperativa: File não passa por Zod direto).
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Anexe o comprovante (imagem ou PDF)." };
  }
  if (!ALLOWED_PROOF_TYPES.includes(file.type as (typeof ALLOWED_PROOF_TYPES)[number])) {
    return { error: "Formato não aceito. Envie uma imagem (JPG/PNG/WebP) ou PDF." };
  }
  if (file.size > MAX_PROOF_BYTES) {
    return { error: "Arquivo muito grande. O limite é 5 MB." };
  }

  const obs = proofObservationSchema.safeParse(formData.get("observation") || undefined);
  if (!obs.success) {
    return { error: obs.error.issues[0]?.message ?? "Observação inválida." };
  }

  // Sobe no storage e registra o pagamento numa transação: a cobrança vira
  // PROOF_SENT e nasce um Payment PENDING_REVIEW pro organizador revisar.
  const ext = EXT_BY_TYPE[file.type] ?? "bin";
  const key = `${member.group.id}/${charge.id}/${nanoid()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const storedKey = await uploadProof(buffer, file.type, key);

  await db.$transaction([
    db.payment.create({
      data: {
        chargeId: charge.id,
        proofUrl: storedKey,
        status: "PENDING_REVIEW",
        observation: obs.data || null,
      },
    }),
    db.charge.update({
      where: { id: charge.id },
      data: { status: "PROOF_SENT" },
    }),
  ]);

  revalidatePath(`/g/${slug}`);
  return { ok: true };
}
