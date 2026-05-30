import { z } from "zod";

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Validação básica do membro. A normalização do telefone em E.164 acontece
// na server action (precisa transformar, não só validar).
export const memberSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome precisa ter pelo menos 2 caracteres.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  phone: z.string().trim().min(8, "Informe o telefone com DDD."),
  email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || emailRegex.test(v), "E-mail inválido."),
});

export type MemberInput = z.infer<typeof memberSchema>;

// Geração de cobranças: data de vencimento (escolhida pelo organizador) + valor.
export const generateChargesSchema = z.object({
  dueDate: z.coerce.date({ message: "Informe a data de vencimento." }),
  amount: z.coerce
    .number({ message: "Informe um valor válido." })
    .positive("O valor precisa ser maior que zero.")
    .max(1_000_000, "Valor muito alto."),
});
