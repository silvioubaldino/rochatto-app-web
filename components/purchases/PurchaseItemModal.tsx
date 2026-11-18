"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api, APIError } from "@/lib/api";
import { useProdutos } from "@/hooks/useProdutos";
import type { PurchaseItem } from "@/lib/types";
import {
  purchaseItemSchema,
  type PurchaseItemFormData,
  type PurchaseItemFormInput,
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

interface PurchaseItemModalProps {
  open: boolean;
  onClose: () => void;
  purchaseId: string;
  item?: PurchaseItem;
  onSuccess: () => void;
}

/** Linha de reposição: POST/PUT /purchases/{id}/items[/{itemId}] (só Purchase OPEN). */
export function PurchaseItemModal({ open, onClose, purchaseId, item, onSuccess }: PurchaseItemModalProps) {
  const isEdit = !!item;
  const { produtos } = useProdutos();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseItemFormInput, unknown, PurchaseItemFormData>({
    resolver: zodResolver(purchaseItemSchema),
  });

  useEffect(() => {
    if (open) {
      reset(
        item
          ? {
              product_id: item.product_id,
              quantity: String(item.quantity).replace(".", ","),
              unit_cost: item.unit_cost,
            }
          : { product_id: "", quantity: "", unit_cost: 0 },
      );
    }
  }, [open, item, reset]);

  async function onSubmit(data: PurchaseItemFormData) {
    try {
      if (isEdit) {
        await api.put(`/purchases/${purchaseId}/items/${item.id}`, data);
        toast.success("Linha atualizada.");
      } else {
        await api.post(`/purchases/${purchaseId}/items`, data);
        toast.success("Linha adicionada.");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao salvar linha.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar linha" : "Adicionar produto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pi-product">Produto *</Label>
            <select
              id="pi-product"
              {...register("product_id")}
              aria-invalid={!!errors.product_id}
              onChange={(e) => {
                setValue("product_id", e.target.value, { shouldValidate: true });
                const p = produtos.find((x) => x.id === e.target.value);
                if (!isEdit && p?.custo_referencia) setValue("unit_cost", p.custo_referencia);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione...</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
            {errors.product_id && <p className="text-xs text-destructive">{errors.product_id.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pi-qty">Quantidade *</Label>
              <Input id="pi-qty" inputMode="decimal" {...register("quantity")} aria-invalid={!!errors.quantity} />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pi-cost">Custo unitário *</Label>
              <Controller
                control={control}
                name="unit_cost"
                render={({ field }) => (
                  <MoneyInput id="pi-cost" value={field.value ?? 0} onChange={field.onChange} />
                )}
              />
              {errors.unit_cost && <p className="text-xs text-destructive">{errors.unit_cost.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
