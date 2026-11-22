"use client";

import { http } from "@/lib/http";
import { useApiMutation } from "@/lib/mutation";
import type { StockAdjustment } from "@/lib/types";
import { toAdjustmentPayload, type AdjustmentFormData } from "./model";

/** Ajuste de estoque (imutável: erro se corrige com outro ajuste). Emite STOCK_CHANGED. */
export function useCreateAdjustment() {
  return useApiMutation({
    run: (data: AdjustmentFormData) => http.post<StockAdjustment>("/stock/adjustments", toAdjustmentPayload(data)),
    emits: "STOCK_CHANGED",
    successMessage: "Ajuste de estoque registrado.",
    toastOnError: false,
  });
}
