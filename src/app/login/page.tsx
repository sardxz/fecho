import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar — Fechô",
};

interface Props {
  searchParams: Promise<{ state?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { state } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Link href="/">
            <Logo />
          </Link>
        </div>

        <Card>
          {state === "verify-request" ? (
            <>
              <CardHeader className="text-center">
                <CardTitle>Verifique seu e-mail</CardTitle>
                <CardDescription>
                  Enviamos um link de acesso para o seu e-mail. Clique no link
                  para entrar no Fechô.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Não recebeu?{" "}
                  <Link href="/login" className="underline underline-offset-4">
                    Tente novamente
                  </Link>
                </p>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle>Entre no Fechô</CardTitle>
                <CardDescription>
                  {state === "error"
                    ? "Algo deu errado. Tente novamente."
                    : "Digite seu e-mail e te mandamos um link mágico de acesso."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LoginForm />
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Ao continuar, você concorda com nossos Termos de Uso e Política de
          Privacidade.
        </p>
      </div>
    </div>
  );
}
