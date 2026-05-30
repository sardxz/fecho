"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MemberFormState } from "./actions";

type Action = (
  prev: MemberFormState,
  formData: FormData,
) => Promise<MemberFormState>;

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adicionando..." : "Adicionar membro"}
    </Button>
  );
}

export function MemberForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState<MemberFormState, FormData>(
    action,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast.success("Membro adicionado.");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            name="name"
            placeholder="Nome do membro"
            aria-invalid={!!errors.name}
            required
          />
          <FieldError messages={errors.name} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">WhatsApp</Label>
          <Input
            id="phone"
            name="phone"
            placeholder="(11) 99999-9999"
            aria-invalid={!!errors.phone}
            required
          />
          <FieldError messages={errors.phone} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail (opcional)</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="email@exemplo.com"
            aria-invalid={!!errors.email}
          />
          <FieldError messages={errors.email} />
        </div>
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
