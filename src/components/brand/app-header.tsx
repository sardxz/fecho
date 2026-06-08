import Link from "next/link";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(app)/actions";

export function AppHeader({ email }: { email: string }) {
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {email}
          </span>
          <Button variant="ghost" size="sm" render={<Link href="/configuracoes" />}>
            Conta
          </Button>
          <form action={signOutAction}>
            <Button variant="ghost" size="sm" type="submit">
              Sair
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
