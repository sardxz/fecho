"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setSent(true);
      toast.success("Link de acesso enviado!");
    });
  }

  if (sent) {
    return (
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-semibold">Confira seu e-mail</h2>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de acesso para <strong>{email}</strong>. Clique nele
          pra entrar no Fechô.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Seu e-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={pending}
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending || !email}>
        {pending ? "Enviando..." : "Receber link de acesso"}
      </Button>
    </form>
  );
}
