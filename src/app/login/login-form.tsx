"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "./google-button";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [error, setError] = useState("");

  // Login por e-mail + senha.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      // Mensagem genérica de propósito: não revela se o e-mail existe nem se a
      // conta usa Google em vez de senha.
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  // Alternativa / recuperação: manda um link mágico pro e-mail. Útil pra quem
  // entrou por Google (sem senha) ou esqueceu a senha.
  async function handleMagicLink() {
    if (!email) {
      setError("Digite seu e-mail para receber o link.");
      return;
    }
    setSendingLink(true);
    setError("");

    const result = await signIn("resend", {
      email,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    if (result?.error) {
      setError("Não foi possível enviar o link. Tente novamente.");
      setSendingLink(false);
      return;
    }

    window.location.href = "/login?state=verify-request";
  }

  return (
    <div className="space-y-4">
      <GoogleButton />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou com e-mail</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <button
        type="button"
        onClick={handleMagicLink}
        disabled={sendingLink}
        className="w-full text-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-60"
      >
        {sendingLink ? "Enviando link..." : "Esqueci a senha / entrar por link"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link href="/cadastro" className="underline underline-offset-4">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
