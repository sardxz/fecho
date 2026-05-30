import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { db } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db as never),
  providers: [
    Resend({
      // Remetente vem do .env (AUTH_RESEND_FROM) pra não acoplar o domínio
      // ao código. Precisa ser um domínio verificado no Resend.
      from: process.env.AUTH_RESEND_FROM ?? "Fechô <noreply@fechoapp.com.br>",
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login?state=verify-request",
    error: "/login?state=error",
  },
  session: {
    strategy: "database",
  },
  callbacks: {
    // Expõe o id do usuário na sessão (sessão database não traz por padrão).
    // Precisamos dele pra amarrar grupos ao dono com segurança.
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
