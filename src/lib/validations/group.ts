import { z } from "zod";

// "" ou null viram undefined (campos de dia que não se aplicam à frequência).
const emptyToUndef = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

export const groupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "O nome precisa ter pelo menos 2 caracteres.")
      .max(60, "O nome pode ter no máximo 60 caracteres."),
    description: z
      .string()
      .trim()
      .max(280, "A descrição pode ter no máximo 280 caracteres.")
      .optional(),
    defaultAmount: z.coerce
      .number({ message: "Informe um valor válido." })
      .positive("O valor precisa ser maior que zero.")
      .max(1_000_000, "Valor muito alto."),
    frequency: z.enum(["ONCE", "WEEKLY", "MONTHLY"], {
      message: "Selecione uma frequência.",
    }),
    // 0=domingo .. 6=sábado (usado quando WEEKLY)
    weekday: z.preprocess(
      emptyToUndef,
      z.coerce.number().int().min(0).max(6).optional(),
    ),
    // dia do mês 1..31 (usado quando MONTHLY)
    dueDay: z.preprocess(
      emptyToUndef,
      z.coerce.number().int().min(1).max(31).optional(),
    ),
    pixKey: z
      .string()
      .trim()
      .min(2, "Informe a chave Pix.")
      .max(140, "Chave Pix muito longa."),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === "WEEKLY" && data.weekday === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["weekday"],
        message: "Escolha o dia da semana.",
      });
    }
    if (data.frequency === "MONTHLY" && data.dueDay === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDay"],
        message: "Escolha o dia do mês (1 a 31).",
      });
    }
  });

export type GroupInput = z.infer<typeof groupSchema>;
