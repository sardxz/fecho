// Regras do comprovante enviado pelo participante na página pública.
// A validação do arquivo (tipo/tamanho) é imperativa e fica na server action;
// aqui ficam as constantes compartilhadas e o schema da observação.
import { z } from "zod";

export const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5 MB

// Tipos aceitos: imagem (foto do comprovante) ou PDF.
export const ALLOWED_PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const proofObservationSchema = z
  .string()
  .trim()
  .max(280, "A observação pode ter no máximo 280 caracteres.")
  .optional();

// Motivo da recusa, preenchido pelo organizador na Etapa 5. Obrigatório:
// o participante precisa saber por que o comprovante foi recusado pra reenviar.
export const rejectionReasonSchema = z
  .string()
  .trim()
  .min(3, "Explique brevemente o motivo da recusa.")
  .max(280, "O motivo pode ter no máximo 280 caracteres.");
