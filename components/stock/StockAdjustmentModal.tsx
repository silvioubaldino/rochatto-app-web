"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api, APIError } from "@/lib/api";
import { useProdutos } from "@/hooks/useProdutos";
import {
  STOCK_ADJUSTMENT_REASONS,
  STOCK_ADJUSTMENT_REASON_LABELS,
  todayISO,
} from "@/lib/formatters";
import {
  stockAdjustmentSchema,
  toStockAdjustmentPayload,
  type StockAdjustmentFormData,
  type StockAdjustmentFormInput,
} from "@/lib/schemas";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface StockAdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  /** Product pré-selecionado (ex.: aberto a partir do extrato). */
  productId?: string;
  onSuccess: () => void;
}

/** Stock adjustment (POST /stock/adjustments) — imutável; erro se corrige com outro ajuste. */
export function StockAdjustmentModal({ open, onClose, productId, onSuccess }: StockAdjustmentModalProps) {
  const { produtos } = useProdutos();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StockAdjustmentFormInput, unknown, StockAdjustmentFormData>({
    resolver: zodResolver(stockAdjustmentSchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        product_id: productId ?? "",
        quantity: "",
        unit_cost: "",
        reason: "",
        adjusted_at: todayISO(),
        notes: "",
      });
    }
  }, [open, productId, reset]);

  async function onSubmit(data: StockAdjustmentFormData) {
    try {
      await api.post("/stock/adjustments", toStockAdjustmentPayload(data));
      toast.success("Ajuste de estoque registrado.");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao registrar ajuste.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo ajuste de estoque</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adj-product">Produto *</Label>
            <select
              id="adj-product"
              {...register("product_id")}
              aria-invalid={!!errors.product_id}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione...</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                  {p.unidade ? ` (${p.unidade})` : ""}
                </option>
              ))}
            </select>
            {errors.product_id && (
              <p className="text-xs text-destructive">{errors.product_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adj-qty">Quantidade (±) *</Label>
              <Input
                id="adj-qty"
                inputMode="decimal"
                placeholder="ex.: 10 ou -2,5"
                {...register("quantity")}
                aria-invalid={!!errors.quantity}
              />
              {errors.quantity ? (
                <p className="text-xs text-destructive">{errors.quantity.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Negativo para baixar o saldo.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adj-cost">Custo unitário</Label>
              <Input
                id="adj-cost"
                inputMode="decimal"
                placeholder="opcional"
                {...register("unit_cost")}
                aria-invalid={!!errors.unit_cost}
              />
              {errors.unit_cost && (
                <p className="text-xs text-destructive">{errors.unit_cost.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adj-reason">Motivo *</Label>
              <select
                id="adj-reason"
                {...register("reason")}
                aria-invalid={!!errors.reason}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecione...</option>
                {STOCK_ADJUSTMENT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {STOCK_ADJUSTMENT_REASON_LABELS[r]}
                  </option>
                ))}
              </select>
              {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adj-date">Data *</Label>
              <Input
                id="adj-date"
                type="date"
                {...register("adjusted_at")}
                aria-invalid={!!errors.adjusted_at}
              />
              {errors.adjusted_at && (
                <p className="text-xs text-destructive">{errors.adjusted_at.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adj-notes">Observações</Label>
            <Textarea id="adj-notes" {...register("notes")} />
          </div>

          <p className="text-xs text-muted-foreground">
            Ajustes não podem ser editados nem excluídos — para corrigir, registre outro ajuste.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar ajuste
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
