"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { FieldShell } from "@/components/patterns/fields";

/** Marcar como perdido, com o motivo (opcional). */
export function QuoteLostDialog({
  open,
  onOpenChange,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onConfirm: (reason: string) => void;
}) {
  return open ? <LostForm onOpenChange={onOpenChange} pending={pending} onConfirm={onConfirm} /> : null;
}

function LostForm({ onOpenChange, pending, onConfirm }: { onOpenChange: (o: boolean) => void; pending: boolean; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <ResponsiveDialog
      open
      onOpenChange={onOpenChange}
      title="Marcar orçamento como perdido"
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Voltar</Button>
          <Button type="button" variant="destructive" onClick={() => onConfirm(reason)} disabled={pending}>Marcar como perdido</Button>
        </>
      }
    >
      <FieldShell label="Motivo (opcional)" htmlFor="lost-reason">
        <Textarea id="lost-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: preço, prazo, concorrência…" />
      </FieldShell>
    </ResponsiveDialog>
  );
}
