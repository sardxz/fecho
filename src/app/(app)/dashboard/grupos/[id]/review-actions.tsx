"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ReviewState } from "./actions";

type Action = (prev: ReviewState, formData: FormData) => Promise<ReviewState>;

function PendingButton({
  children,
  pendingLabel,
  variant,
}: {
  children: string;
  pendingLabel: string;
  variant?: "default" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

// Botões de revisão de um comprovante. Aprovar é direto; recusar abre um campo
// pro motivo (obrigatório) antes de confirmar. Cada ação já vem com o groupId
// amarrado (bind) e recebe o paymentId num input hidden.
export function ReviewActions({
  paymentId,
  approveAction,
  rejectAction,
}: {
  paymentId: string;
  approveAction: Action;
  rejectAction: Action;
}) {
  const [approveState, approve] = useActionState<ReviewState, FormData>(
    approveAction,
    {},
  );
  const [rejectState, reject] = useActionState<ReviewState, FormData>(
    rejectAction,
    {},
  );
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    if (approveState.ok) toast.success("Comprovante aprovado.");
    if (approveState.error) toast.error(approveState.error);
  }, [approveState]);

  useEffect(() => {
    if (rejectState.ok) toast.success("Comprovante recusado.");
    if (rejectState.error) toast.error(rejectState.error);
  }, [rejectState]);

  if (rejecting) {
    return (
      <form action={reject} className="flex flex-col gap-2">
        <input type="hidden" name="paymentId" value={paymentId} />
        <Label htmlFor={`reason-${paymentId}`} className="text-xs">
          Motivo da recusa
        </Label>
        <Textarea
          id={`reason-${paymentId}`}
          name="reason"
          placeholder="Ex: comprovante ilegível ou valor diferente."
          rows={2}
          maxLength={280}
          required
          autoFocus
        />
        <div className="flex gap-2">
          <PendingButton pendingLabel="Recusando..." variant="default">
            Confirmar recusa
          </PendingButton>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setRejecting(false)}
          >
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex gap-2">
      <form action={approve}>
        <input type="hidden" name="paymentId" value={paymentId} />
        <PendingButton pendingLabel="Aprovando...">Aprovar</PendingButton>
      </form>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="text-destructive"
        onClick={() => setRejecting(true)}
      >
        Recusar
      </Button>
    </div>
  );
}
