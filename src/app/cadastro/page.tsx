import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { SignupForm } from "./signup-form";

export const metadata = {
  title: "Criar conta — Fechô",
};

export default async function SignupPage() {
  // Já logado não cria conta — vai pro painel.
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Link href="/">
            <Logo />
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Crie sua conta</CardTitle>
            <CardDescription>
              Organize as cobranças do seu grupo em um só lugar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignupForm />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Ao continuar, você concorda com nossos Termos de Uso e Política de
          Privacidade.
        </p>
      </div>
    </div>
  );
}
