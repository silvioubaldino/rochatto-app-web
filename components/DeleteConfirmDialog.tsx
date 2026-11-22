"use client";

import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  /** Rótulo do botão de confirmação (padrão: "Excluir"). */
  confirmLabel?: string;
}

/** Invólucro legado: a confirmação do irreversível é o `ConfirmDialog` (UX-8). */
export function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Excluir",
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel="Cancelar"
      tone="danger"
      onConfirm={onConfirm}
    />
  );
}
