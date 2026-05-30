"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ChargeFormState } from "./actions";

type Action = (
  prev: ChargeFormState,
  formData: FormData,
) => Promise<ChargeFormState>;

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Gerando..." : "Gerar cobranças"}
    </Button>
  );
}

export function ChargeGenerator({
  action,
  defaultAmount,
}: {
  action: Action;
  defaultAmount: string;
}) {
  const [state, formAction] = useActionState<ChargeFormState, FormData>(
    action,
    {},
  );
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.created) {
      toast.success(
        state.created === 1
          ? "1 cobrança gerada."
          : `${state.created} cobranças geradas.`,
      );
    }
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="dueDate">Vencimento</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            aria-invalid={!!errors.dueDate}
            required
          />
          <FieldError messages={errors.dueDate} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Valor (R$)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={defaultAmount}
            aria-invalid={!!errors.amount}
            required
          />
          <FieldError messages={errors.amount} />
        </div>

        <SubmitButton />
      </div>

      <p className="text-xs text-muted-foreground">
        Gera uma cobrança pendente pra cada membro ativo. Quem já tiver cobrança
        nessa data é ignorado.
      </p>
    </form>
  );
}
