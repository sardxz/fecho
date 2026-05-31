"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProofFormState } from "./actions";

type Action = (
  prev: ProofFormState,
  formData: FormData,
) => Promise<ProofFormState>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="cursor-pointer">
      {pending ? "Enviando..." : "Enviar comprovante"}
    </Button>
  );
}

// Form de envio de comprovante de uma cobrança específica. `action` já vem
// com slug+token amarrados (bind); o chargeId vai num input hidden.
export function ProofForm({
  action,
  chargeId,
}: {
  action: Action;
  chargeId: string;
}) {
  const [state, formAction] = useActionState<ProofFormState, FormData>(
    action,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast.success("Comprovante enviado! O organizador vai conferir.");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="chargeId" value={chargeId} />

      {state.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor={`file-${chargeId}`}>Comprovante (imagem ou PDF)</Label>
        <Input
          id={`file-${chargeId}`}
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required
          className="cursor-pointer"
        />
        <p className="text-xs text-muted-foreground">
          Foto do comprovante ou PDF, até 5 MB.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`obs-${chargeId}`}>Observação (opcional)</Label>
        <Textarea
          id={`obs-${chargeId}`}
          name="observation"
          placeholder="Algo que o organizador precise saber?"
          rows={2}
          maxLength={280}
        />
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
