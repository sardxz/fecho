import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Dashboard — Fechô",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Seus grupos
          </h1>
          <p className="text-muted-foreground">
            Crie um grupo pra começar a organizar pagamentos.
          </p>
        </div>
        <Button disabled>Criar grupo</Button>
      </header>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Nenhum grupo por aqui ainda</CardTitle>
          <CardDescription>
            Os grupos que você criar aparecerão aqui. Na próxima etapa do MVP
            você vai conseguir criar o primeiro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled>Criar meu primeiro grupo</Button>
        </CardContent>
      </Card>
    </div>
  );
}
