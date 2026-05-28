import { AppHeader } from "@/components/brand/app-header";

// TODO (Fase 4 — Auth.js): ler sessão via `auth()` do NextAuth, redirecionar
// pra /login quando ausente e passar o e-mail real pro AppHeader.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader email="" />
      <main className="container mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
