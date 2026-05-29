import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { db } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db as never),
  providers: [
    Resend({
      from: "Fechô <noreply@fecho.com.br>",
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
});
