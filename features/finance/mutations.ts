"use client";

import { http } from "@/lib/http";
import { useApiMutation } from "@/lib/mutation";
import { toInstallmentsPayload, type PlanLine } from "@/components/entity/installment-plan";
import type { FinancialMovement, ObligationSettlement, ObligationWarning, SettlementResponse } from "@/lib/types";
import { toMovementPayload, toSettlePayload, type MovementFormData, type SettleFormData } from "./model";

export function useSettle() {
  return useApiMutation({
    run: (data: SettleFormData) => http.post<SettlementResponse>("/settlements", toSettlePayload(data)),
    emits: "MONEY_MOVED",
    toastOnError: false,
  });
}

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

export function useRestoreSettlement() {
  return useApiMutation({
    run: (obligationId: string, s: ObligationSettlement) =>
      http.post<SettlementResponse>("/settlements", { movement_id: s.movement.id, allocations: [{ obligation_id: obligationId, amount: s.amount }] }),
    emits: "MONEY_MOVED",
    errorFallback: "Não foi possível desfazer.",
  });
}

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

export function useSaveMovement(movement?: FinancialMovement) {
  return useApiMutation({
    run: (data: MovementFormData) =>
      movement ? http.put<FinancialMovement>(`/financial-movements/${movement.id}`, toMovementPayload(data)) : http.post<FinancialMovement>("/financial-movements", toMovementPayload(data)),
    emits: "MONEY_MOVED",
    toastOnError: false,
  });
}

export const warningsOf = (r: { warnings?: ObligationWarning[] | null } | undefined): ObligationWarning[] => r?.warnings ?? [];
