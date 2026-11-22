"use client";

import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
}

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
