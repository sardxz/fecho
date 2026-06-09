"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { weekdayNames } from "@/lib/format";
import type { GroupFormState } from "./actions";

type Action = (
  prev: GroupFormState,
  formData: FormData,
) => Promise<GroupFormState>;

type Frequency = "ONCE" | "WEEKLY" | "MONTHLY";

type Defaults = {
  name?: string;
  description?: string | null;
  defaultAmount?: string;
  frequency?: Frequency;
  weekday?: number | null;
  dueDay?: number | null;
  pixKey?: string;
};

const frequencyOptions = [
  { value: "MONTHLY", label: "Mensal" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "ONCE", label: "Única" },
];

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

export function GroupForm({
  action,
  defaultValues,
  submitLabel = "Salvar",
}: {
  action: Action;
  defaultValues?: Defaults;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState<GroupFormState, FormData>(
    action,
    {},
  );
  const errors = state.fieldErrors ?? {};
  const [frequency, setFrequency] = useState<Frequency>(
    defaultValues?.frequency ?? "MONTHLY",
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <span>{state.error}</span>
          {state.upgrade && (
            <Button size="sm" render={<Link href="/dashboard/assinatura" />}>
              Assinar PRO
            </Button>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nome do grupo</Label>
        <Input
          id="name"
          name="name"
          placeholder="Ex: Pelada de quinta"
          defaultValue={defaultValues?.name}
          aria-invalid={!!errors.name}
          required
        />
        <FieldError messages={errors.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Uma linha sobre o grupo, pra ajudar os membros a se identificarem."
          defaultValue={defaultValues?.description ?? ""}
          aria-invalid={!!errors.description}
        />
        <FieldError messages={errors.description} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="defaultAmount">Valor padrão (R$)</Label>
          <Input
            id="defaultAmount"
            name="defaultAmount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            placeholder="50,00"
            defaultValue={defaultValues?.defaultAmount}
            aria-invalid={!!errors.defaultAmount}
            required
          />
          <FieldError messages={errors.defaultAmount} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="frequency">Frequência</Label>
          <select
            id="frequency"
            name="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
            aria-invalid={!!errors.frequency}
            className={cn(selectClass)}
          >
            {frequencyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <FieldError messages={errors.frequency} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Campo de dia muda conforme a frequência (Única não tem). */}
        {frequency === "WEEKLY" && (
          <div className="space-y-2">
            <Label htmlFor="weekday">Dia da semana</Label>
            <select
              id="weekday"
              name="weekday"
              defaultValue={defaultValues?.weekday ?? ""}
              aria-invalid={!!errors.weekday}
              className={cn(selectClass)}
            >
              <option value="" disabled>
                Selecione...
              </option>
              {weekdayNames.map((label, i) => (
                <option key={i} value={i}>
                  {label.charAt(0).toUpperCase() + label.slice(1)}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              A cobrança é gerada automaticamente toda semana neste dia.
            </p>
            <FieldError messages={errors.weekday} />
          </div>
        )}

        {frequency === "MONTHLY" && (
          <div className="space-y-2">
            <Label htmlFor="dueDay">Dia do mês</Label>
            <Input
              id="dueDay"
              name="dueDay"
              type="number"
              min="1"
              max="31"
              placeholder="10"
              defaultValue={defaultValues?.dueDay ?? undefined}
              aria-invalid={!!errors.dueDay}
            />
            <p className="text-xs text-muted-foreground">
              A cobrança é gerada automaticamente todo mês neste dia (dia 29–31
              cai no último dia em meses curtos).
            </p>
            <FieldError messages={errors.dueDay} />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="pixKey">Chave Pix</Label>
          <Input
            id="pixKey"
            name="pixKey"
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            defaultValue={defaultValues?.pixKey}
            aria-invalid={!!errors.pixKey}
            required
          />
          <FieldError messages={errors.pixKey} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
        <Button variant="ghost" render={<Link href="/dashboard" />}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
