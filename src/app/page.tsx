import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MarketingHeader } from "@/components/brand/marketing-header";
import { Logo } from "@/components/brand/logo";

const personas = [
  { titulo: "Peladas e times", desc: "Cobre a mensalidade do futebol semanal." },
  { titulo: "Churrascos", desc: "Divida a conta do churras recorrente." },
  { titulo: "Vaquinhas", desc: "Receba a contribuição da galera de um jeito só." },
  { titulo: "Grupos de igreja", desc: "Organize ofertas e contribuições mensais." },
  { titulo: "Turmas de curso", desc: "Cobre mensalidade da mentoria ou turma." },
  { titulo: "Condomínios pequenos", desc: "Controle quem pagou a taxa do mês." },
];

const passos = [
  {
    n: "1",
    titulo: "Crie seu grupo",
    desc: "Defina nome, valor, vencimento e sua chave Pix em menos de 1 minuto.",
  },
  {
    n: "2",
    titulo: "Cadastre os membros",
    desc: "Adicione quem participa e gere as cobranças do mês de uma vez só.",
  },
  {
    n: "3",
    titulo: "Cobre e acompanhe",
    desc: "Mande lembretes pelo WhatsApp e aprove os comprovantes que chegarem.",
  },
];

const beneficios = [
  "Pare de perguntar 'já pagou?' no grupo",
  "Tenha um painel com quem pagou e quem está devendo",
  "Mande cobranças prontas pelo WhatsApp com 1 clique",
  "Receba comprovantes de Pix e aprove num toque",
  "Veja quanto entrou no mês sem planilha nenhuma",
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto max-w-5xl px-4 py-20 text-center sm:py-28">
          <div className="mx-auto max-w-3xl space-y-6">
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              MVP em construção · Pix manual
            </span>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Pare de cobrar seu grupo no{" "}
              <span className="text-emerald-600">WhatsApp</span>.
            </h1>
            <p className="text-lg text-muted-foreground sm:text-xl">
              O Fechô organiza pagamentos, pendências e comprovantes de grupos
              num único painel — sem planilha, sem confusão.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link href="/login" className={buttonVariants({ size: "lg" })}>
                Criar meu grupo
              </Link>
              <Link
                href="#como-funciona"
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                Como funciona
              </Link>
            </div>
          </div>
        </section>

        {/* Para quem é */}
        <section className="border-y bg-muted/30 py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                Pra quem é o Fechô
              </h2>
              <p className="mt-2 text-muted-foreground">
                Grupos pequenos e recorrentes que cansaram de cobrar no privado.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {personas.map((p) => (
                <Card key={p.titulo}>
                  <CardHeader>
                    <CardTitle className="text-lg">{p.titulo}</CardTitle>
                    <CardDescription>{p.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="py-20">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                Como funciona
              </h2>
              <p className="mt-2 text-muted-foreground">
                Três passos simples pra deixar a cobrança no automático.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {passos.map((passo) => (
                <Card key={passo.n}>
                  <CardHeader>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                      {passo.n}
                    </div>
                    <CardTitle className="text-xl">{passo.titulo}</CardTitle>
                    <CardDescription>{passo.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefícios */}
        <section className="border-y bg-muted/30 py-20">
          <div className="container mx-auto max-w-3xl px-4">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                O que o Fechô resolve
              </h2>
            </div>
            <ul className="space-y-3">
              {beneficios.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-3 rounded-lg border bg-background p-4"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                  >
                    ✓
                  </span>
                  <span className="text-sm sm:text-base">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-20">
          <div className="container mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Pronto pra organizar seu grupo?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Comece grátis. Sem cartão. Sem instalação.
            </p>
            <div className="mt-8">
              <Link href="/login" className={buttonVariants({ size: "lg" })}>
                Criar meu grupo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row">
          <Logo className="text-base" />
          <p>© {new Date().getFullYear()} Fechô. Feito no Brasil.</p>
        </div>
      </footer>
    </div>
  );
}
