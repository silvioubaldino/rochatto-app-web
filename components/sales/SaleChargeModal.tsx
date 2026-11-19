"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api, APIError } from "@/lib/api";
import { SALE_CHARGE_KINDS, SALE_CHARGE_KIND_LABELS } from "@/lib/formatters";
import type { SaleCharge } from "@/lib/types";
import { saleChargeSchema, toSaleChargePayload, type SaleChargeFormData } from "@/lib/schemas";
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

interface SaleChargeModalProps {
  open: boolean;
  onClose: () => void;
  saleId: string;
  charge?: SaleCharge;
  onSuccess: () => void;
}

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

export function SaleChargeModal({ open, onClose, saleId, charge, onSuccess }: SaleChargeModalProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SaleChargeFormData>({ resolver: zodResolver(saleChargeSchema) });

  useEffect(() => {
    if (!open) return;
    reset(
      charge
        ? { kind: charge.kind, amount: charge.amount, description: charge.description ?? "" }
        : { kind: "FREIGHT", amount: 0, description: "" },
    );
  }, [open, charge, reset]);

  async function onSubmit(data: SaleChargeFormData) {
    const payload = toSaleChargePayload(data);
    try {
      if (charge) await api.put(`/vendas/${saleId}/charges/${charge.id}`, payload);
      else await api.post(`/vendas/${saleId}/charges`, payload);
      toast.success(charge ? "Cobrança atualizada." : "Cobrança lançada.");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao salvar cobrança.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{charge ? "Editar cobrança" : "Nova cobrança ao cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sc-kind">Tipo *</Label>
            <select id="sc-kind" {...register("kind")} className={selectClass}>
              {SALE_CHARGE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {SALE_CHARGE_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sc-amount">Valor *</Label>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <MoneyInput id="sc-amount" value={field.value ?? 0} onChange={field.onChange} />
              )}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sc-desc">Descrição</Label>
            <Input id="sc-desc" {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
