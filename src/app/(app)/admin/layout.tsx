import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Guard do painel admin. Lê o role DIRETO do banco (não do token JWT) pra que
// promover/rebaixar alguém valha na hora, sem precisar relogar. Não-admins
// recebem 404 — não revelamos que a rota existe.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") notFound();

  return <>{children}</>;
}
