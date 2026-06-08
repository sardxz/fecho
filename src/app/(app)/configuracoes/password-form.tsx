"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword, type PasswordFormState } from "./actions";

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

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action] = useActionState<PasswordFormState, FormData>(
    updatePassword,
    {},
  );
  const errors = state.fieldErrors ?? {};
  const submitLabel = hasPassword ? "Alterar senha" : "Definir senha";

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.ok && (
        <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          {hasPassword ? "Senha alterada." : "Senha definida."} Da próxima vez
          você pode entrar com e-mail e senha.
        </p>
      )}

      {state.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      {/* Senha atual só existe quando a conta já tem senha. */}
      {hasPassword && (
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Senha atual</Label>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.currentPassword}
            required
          />
          <FieldError messages={errors.currentPassword} />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="newPassword">Nova senha</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          minLength={8}
          aria-invalid={!!errors.newPassword}
          required
        />
        <FieldError messages={errors.newPassword} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          aria-invalid={!!errors.confirmPassword}
          required
        />
        <FieldError messages={errors.confirmPassword} />
      </div>

      <div>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
