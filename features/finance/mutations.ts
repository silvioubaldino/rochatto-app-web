"use client";

import { http } from "@/lib/http";
import { useApiMutation } from "@/lib/mutation";
import { toInstallmentsPayload, type PlanLine } from "@/components/entity/installment-plan";
import type { FinancialMovement, ObligationSettlement, ObligationWarning, SettlementResponse } from "@/lib/types";
import { toMovementPayload, toSettlePayload, type MovementFormData, type SettleFormData } from "./model";

/** Pagar/Receber 1..N contas com uma movimentação (`POST /settlements`). O 409 fica no diálogo. */
export function useSettle() {
  return useApiMutation({
    run: (data: SettleFormData) => http.post<SettlementResponse>("/settlements", toSettlePayload(data)),
    emits: "MONEY_MOVED",
    toastOnError: false,
  });
}

/** Anula a movimentação (desfaz o Pagar/Receber): as quitações saem e as contas voltam a ficar em aberto. */
export function useVoidMovement() {
  return useApiMutation({
    run: async (movementId: string) => {
      await http.delete(`/financial-movements/${movementId}`);
      return true as const;
    },
    emits: "MONEY_MOVED",
    errorFallback: "Não foi possível anular a movimentação.",
  });
}

/** Anular com erro no diálogo (a tela de movimentações). */
export function useVoidMovementConfirmed() {
  return useApiMutation({
    run: async (movementId: string) => {
      await http.delete(`/financial-movements/${movementId}`);
      return true as const;
    },
    emits: "MONEY_MOVED",
    successMessage: "Movimentação anulada.",
    toastOnError: false,
  });
}

/** Desfaz uma quitação (`DELETE /settlements/{id}`); a movimentação permanece, sem alocação. */
export function useUndoSettlement() {
  return useApiMutation({
    run: async (settlementId: string) => {
      await http.delete(`/settlements/${settlementId}`);
      return true as const;
    },
    emits: "MONEY_MOVED",
    errorFallback: "Erro ao desfazer a quitação.",
  });
}

/** Refaz a quitação desfeita, ligando a MESMA movimentação à conta (`movement_id`). */
export function useRestoreSettlement() {
  return useApiMutation({
    run: (obligationId: string, s: ObligationSettlement) =>
      http.post<SettlementResponse>("/settlements", { movement_id: s.movement.id, allocations: [{ obligation_id: obligationId, amount: s.amount }] }),
    emits: "MONEY_MOVED",
    errorFallback: "Não foi possível desfazer.",
  });
}

/** Plano de parcelas da conta (`PUT /obligations/{id}/installments`; lista vazia remove o plano). */
export function useSetInstallments() {
  return useApiMutation({
    run: async (obligationId: string, lines: readonly PlanLine[]) => {
      await http.put(`/obligations/${obligationId}/installments`, { installments: toInstallmentsPayload(lines) });
      return true as const;
    },
    emits: "MONEY_MOVED",
    successMessage: "Plano de parcelas salvo.",
    toastOnError: false,
  });
}

/** Prazo final e observações (`PATCH /obligations/{id}` só com o que mudou). */
export function usePatchObligation(obligationId: string) {
  return useApiMutation({
    run: async (patch: { due_date?: string | null; notes?: string | null }) => {
      await http.patch(`/obligations/${obligationId}`, patch);
      return true as const;
    },
    emits: "MONEY_MOVED",
    successMessage: "Conta atualizada.",
    toastOnError: false,
  });
}

/** Despesa ou receita avulsa (criar) / correção (editar). 409 fica no formulário. */
export function useSaveMovement(movement?: FinancialMovement) {
  return useApiMutation({
    run: (data: MovementFormData) =>
      movement ? http.put<FinancialMovement>(`/financial-movements/${movement.id}`, toMovementPayload(data)) : http.post<FinancialMovement>("/financial-movements", toMovementPayload(data)),
    emits: "MONEY_MOVED",
    toastOnError: false,
  });
}

/** Avisos (2xx) de uma resposta de quitação. */
export const warningsOf = (r: { warnings?: ObligationWarning[] | null } | undefined): ObligationWarning[] => r?.warnings ?? [];
