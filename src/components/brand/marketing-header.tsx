import Link from "next/link";
import { Logo } from "./logo";
import { buttonVariants } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="border-b border-violet-200/70 bg-linear-to-r from-violet-50 via-fuchsia-50 to-sky-50/90 backdrop-blur">
      <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Entrar
          </Link>
          <Link href="/login" className={buttonVariants({ size: "sm" })}>
            Criar meu grupo
          </Link>
        </nav>
      </div>
    </header>
  );
}
