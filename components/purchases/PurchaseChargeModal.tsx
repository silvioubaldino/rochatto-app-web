"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api, APIError } from "@/lib/api";
import { useFornecedores } from "@/hooks/useFornecedores";
import { PURCHASE_CHARGE_KINDS, PURCHASE_CHARGE_KIND_LABELS } from "@/lib/formatters";
import type { PurchaseCharge } from "@/lib/types";
import {
  purchaseChargeSchema,
  toPurchaseChargePayload,
  type PurchaseChargeFormData,
} from "@/lib/schemas";
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

interface PurchaseChargeModalProps {
  open: boolean;
  onClose: () => void;
  purchaseId: string;
  /** Credor padrão do custo novo (o Supplier da compra). */
  defaultSupplierId: string;
  /** Presente = edição (PUT de substituição completa). */
  charge?: PurchaseCharge;
  /** `warnings` vem da resposta (ex.: OVERSETTLED). */
  onSuccess: (warnings: string[]) => void;
}

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

/** POST/PUT /purchases/{id}/charges — custo adicional da compra com credor editável (AYD-008 §1). */
export function PurchaseChargeModal({
  open,
  onClose,
  purchaseId,
  defaultSupplierId,
  charge,
  onSuccess,
}: PurchaseChargeModalProps) {
  const { fornecedores } = useFornecedores();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseChargeFormData>({ resolver: zodResolver(purchaseChargeSchema) });

  useEffect(() => {
    if (!open) return;
    reset(
      charge
        ? {
            kind: charge.kind,
            amount: charge.amount,
            description: charge.description ?? "",
            payee_supplier_id: charge.payee_supplier_id ?? "",
          }
        : { kind: "FREIGHT", amount: 0, description: "", payee_supplier_id: defaultSupplierId },
    );
  }, [open, charge, defaultSupplierId, reset]);

  async function onSubmit(data: PurchaseChargeFormData) {
    const payload = toPurchaseChargePayload(data);
    try {
      const res = charge
        ? await api.put<PurchaseCharge>(`/purchases/${purchaseId}/charges/${charge.id}`, payload)
        : await api.post<PurchaseCharge>(`/purchases/${purchaseId}/charges`, payload);
      toast.success(charge ? "Custo adicional atualizado." : "Custo adicional lançado.");
      onSuccess(res?.warnings ?? []);
      onClose();
    } catch (err) {
      // 400 (valor ≤ 0), 404, 409 e 422 (rateio por quantidade com unidades diferentes).
      toast.error(err instanceof APIError ? err.message : "Erro ao salvar custo adicional.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{charge ? "Editar custo adicional" : "Novo custo adicional"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pc-kind">Tipo *</Label>
            <select id="pc-kind" {...register("kind")} className={selectClass}>
              {PURCHASE_CHARGE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {PURCHASE_CHARGE_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pc-amount">Valor *</Label>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <MoneyInput id="pc-amount" value={field.value ?? 0} onChange={field.onChange} />
              )}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pc-payee">Credor</Label>
            <select id="pc-payee" {...register("payee_supplier_id")} className={selectClass}>
              <option value="">A definir</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pc-desc">Descrição</Label>
            <Input id="pc-desc" {...register("description")} />
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
