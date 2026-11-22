"use client";

import { SettleDialog } from "@/components/obligations/SettleDialog";
import { useObligation } from "@/hooks/useObligations";
import { useEmit } from "@/lib/events";

/**
 * Receber/Pagar uma conta direto da pendência. Usa o diálogo existente até a fase U5 trazer o
 * `SettleFlow` (1..N contas, com desfazer).
 */
export function SettleFromPending({ obligationId, onClose }: { obligationId: string; onClose: () => void }) {
  const emit = useEmit();
  const { obligation } = useObligation(obligationId);
  if (!obligation) return null;
  return (
    <SettleDialog
      open
      onClose={onClose}
      obligation={obligation}
      onDone={() => void emit("MONEY_MOVED")}
    />
  );
}
