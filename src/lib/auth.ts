import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { credentialsLoginSchema } from "./validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db as never),
  // JWT (token assinado) em vez de sessão no banco: é o que permite o login
  // com senha (Credentials) e o que casa com o app futuro — apps guardam
  // token, não cookie de sessão de navegador. O id do usuário vive em
  // token.sub e é exposto na sessão pelo callback abaixo.
  session: { strategy: "jwt" },
  providers: [
    Google({
      // Vincula automaticamente quando o e-mail já existe (ex.: cadastrou com
      // senha e depois entra com Google → mesma conta). É seguro porque o
      // Google sempre verifica o e-mail antes de devolver pra gente; o risco
      // de "dangerous" só existe com provedores que NÃO verificam e-mail.
      allowDangerousEmailAccountLinking: true,
    }),
    Resend({
      // Remetente vem do .env (AUTH_RESEND_FROM) pra não acoplar o domínio
      // ao código. Precisa ser um domínio verificado no Resend. Sem ele, cai no
      // remetente de sandbox do Resend, que só entrega no e-mail dono da conta:
      // serve pra desenvolvimento, nunca pra produção.
      from: process.env.AUTH_RESEND_FROM ?? "Fechô <onboarding@resend.dev>",
    }),
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      // Valida e-mail+senha contra o hash bcrypt no banco. Retornar null =
      // falha de login; a UI mostra mensagem genérica ("e-mail ou senha
      // incorretos") sem revelar se o e-mail existe ou se a conta usa Google.
      authorize: async (raw) => {
        const parsed = credentialsLoginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({ where: { email } });
        // Sem passwordHash = conta criada por Google/magic link, sem senha.
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login?state=verify-request",
    error: "/login?state=error",
  },
  callbacks: {
    // Com JWT o id do usuário fica em token.sub. Expomos na sessão pra amarrar
    // grupos ao dono com segurança (mesmo uso de antes, agora via token).
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
