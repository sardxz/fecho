import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppHeader } from "@/components/brand/app-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  // O link do painel admin só aparece pra quem é ADMIN (lido do banco).
  const me = session.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      })
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader
        email={session.user?.email ?? ""}
        isAdmin={me?.role === "ADMIN"}
      />
      <main className="container mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
