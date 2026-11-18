"use client";

import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import { formatMoeda } from "@/lib/formatters";
import type { ObligationSettlement } from "@/lib/types";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

interface UndoSettlementDialogProps {
  settlement: ObligationSettlement | null;
  onClose: () => void;
  onDone: () => void;
}

/** `DELETE /settlements/{id}` — desfaz a quitação; a movimentação permanece. */
export function UndoSettlementDialog({ settlement, onClose, onDone }: UndoSettlementDialogProps) {
  async function confirm() {
    if (!settlement) return;
    try {
      await api.delete(`/settlements/${settlement.id}`);
      toast.success("Quitação desfeita. A movimentação continua na lista.");
      onDone();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao desfazer a quitação.");
    } finally {
      onClose();
    }
  }

  return (
    <DeleteConfirmDialog
      open={!!settlement}
      onClose={onClose}
      onConfirm={confirm}
      title="Desfazer quitação"
      confirmLabel="Desfazer"
      description={`A quitação de ${settlement ? formatMoeda(settlement.amount) : ""} sai da conta; a movimentação não é apagada e fica sem alocação.`}
    />
  );
}
