"use client";

import { toast } from "sonner";
import { APIError } from "@/lib/api";
import { OBLIGATION_WARNING_MESSAGES, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/formatters";
import type { ObligationWarning } from "@/lib/types";

export const SELECT_CLASS = "h-8 w-full rounded-md border border-input bg-background px-3 text-sm";

export function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

export function PaymentMethodOptions({ placeholder }: { placeholder: string }) {
  return (
    <>
      <option value="">{placeholder}</option>
      {PAYMENT_METHODS.map((m) => (
        <option key={m} value={m}>
          {PAYMENT_METHOD_LABELS[m]}
        </option>
      ))}
    </>
  );
}

/** Mostra os `warnings` de uma resposta 2xx (não bloqueiam; a operação já foi gravada). */
export function notifyWarnings(warnings: ObligationWarning[] | null | undefined) {
  for (const w of warnings ?? []) {
    toast.warning(OBLIGATION_WARNING_MESSAGES[w] ?? w);
  }
}

/** 409 (conflito de regra) vira erro do formulário; o resto vai para toast. Retorna o 409, se houve. */
export function conflictOrToast(err: unknown, fallback: string): string | null {
  if (err instanceof APIError && err.status === 409) return err.message;
  toast.error(err instanceof APIError ? err.message : fallback);
  return null;
}
