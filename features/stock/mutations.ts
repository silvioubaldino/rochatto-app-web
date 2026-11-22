"use client";

import { http } from "@/lib/http";
import { useApiMutation } from "@/lib/mutation";
import type { StockAdjustment } from "@/lib/types";
import { toAdjustmentPayload, type AdjustmentFormData } from "./model";

export function useCreateAdjustment() {
  return useApiMutation({
    run: (data: AdjustmentFormData) => http.post<StockAdjustment>("/stock/adjustments", toAdjustmentPayload(data)),
    emits: "STOCK_CHANGED",
    successMessage: "Ajuste de estoque registrado.",
    toastOnError: false,
  });
}
