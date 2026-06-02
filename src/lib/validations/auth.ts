// Validações de cadastro e login por e-mail/senha.
import { z } from "zod";

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => emailRegex.test(v), "Informe um e-mail válido.");

// bcrypt ignora bytes além de 72 — limitamos pra não dar falsa sensação de
// senha "mais forte" por ser longa demais. Mínimo de 8 por segurança.
export const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter no mínimo 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.");

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome.")
    .max(60, "O nome pode ter no máximo 60 caracteres."),
  email: emailSchema,
  password: passwordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;

// No login não revelamos os requisitos da senha — só exigimos que venha algo.
// A checagem real é contra o hash no banco (ver authorize em src/lib/auth.ts).
export const credentialsLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
