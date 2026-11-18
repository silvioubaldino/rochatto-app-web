"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api, APIError } from "@/lib/api";
import { formatMoeda, todayISO } from "@/lib/formatters";
import { supplierPaymentSchema, type SupplierPaymentFormData } from "@/lib/schemas";
import type { PurchasePaymentResponse } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/MoneyInput";

interface SupplierPaymentModalProps {
  open: boolean;
  onClose: () => void;
  purchaseId: string;
  totalCost: number;
  onSuccess: () => void;
}

/** Supplier payment consolidado (um por Purchase): PATCH /purchases/{id}/payment com PAID. */
export function SupplierPaymentModal({ open, onClose, purchaseId, totalCost, onSuccess }: SupplierPaymentModalProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierPaymentFormData>({ resolver: zodResolver(supplierPaymentSchema) });

  useEffect(() => {
    if (open) reset({ paid_amount: totalCost, paid_at: todayISO() });
  }, [open, totalCost, reset]);

  async function onSubmit(data: SupplierPaymentFormData) {
    try {
      const res = await api.patch<PurchasePaymentResponse>(`/purchases/${purchaseId}/payment`, {
        payment_status: "PAID",
        paid_amount: data.paid_amount,
        paid_at: data.paid_at,
      });
      toast.success(
        res && res.to_pay > 0
          ? `Pagamento registrado. Ainda a pagar: ${formatMoeda(res.to_pay)}.`
          : "Pagamento registrado.",
      );
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao registrar pagamento.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar pagamento ao fornecedor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Custo total da compra: <strong>{formatMoeda(totalCost)}</strong>
          </p>
          <div className="space-y-2">
            <Label htmlFor="sp-amount">Valor pago *</Label>
            <Controller
              control={control}
              name="paid_amount"
              render={({ field }) => (
                <MoneyInput id="sp-amount" value={field.value ?? 0} onChange={field.onChange} />
              )}
            />
            {errors.paid_amount && <p className="text-xs text-destructive">{errors.paid_amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sp-date">Data do pagamento *</Label>
            <Input id="sp-date" type="date" {...register("paid_at")} aria-invalid={!!errors.paid_at} />
            {errors.paid_at && <p className="text-xs text-destructive">{errors.paid_at.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
