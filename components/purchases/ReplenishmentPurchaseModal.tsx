"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { api, APIError } from "@/lib/api";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useProdutos } from "@/hooks/useProdutos";
import { ALLOCATION_METHODS, ALLOCATION_METHOD_LABELS } from "@/lib/formatters";
import type { PurchaseDetail } from "@/lib/types";
import {
  replenishmentPurchaseSchema,
  toReplenishmentPurchasePayload,
  type ReplenishmentPurchaseFormData,
  type ReplenishmentPurchaseFormInput,
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
import { MoneyInput } from "@/components/ui/MoneyInput";

interface ReplenishmentPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const EMPTY_LINE = { product_id: "", quantity: "", unit_cost: 0 };

/** Nova Purchase para repor Stock (kind STOCK_REPLENISHMENT) com linhas de Product. */
export function ReplenishmentPurchaseModal({ open, onClose, onCreated }: ReplenishmentPurchaseModalProps) {
  const router = useRouter();
  const { fornecedores } = useFornecedores();
  const { produtos } = useProdutos();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReplenishmentPurchaseFormInput, unknown, ReplenishmentPurchaseFormData>({
    resolver: zodResolver(replenishmentPurchaseSchema),
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    if (open) {
      reset({ supplier_id: "", expected_date: "", notes: "", allocation_method: "BY_QUANTITY", items: [EMPTY_LINE] });
    }
  }, [open, reset]);

  async function onSubmit(data: ReplenishmentPurchaseFormData) {
    try {
      const created = await api.post<PurchaseDetail>(
        "/purchases",
        toReplenishmentPurchasePayload(data),
      );
      toast.success("Compra para estoque criada.");
      onCreated();
      onClose();
      if (created?.id) router.push(`/compras/${created.id}`);
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao criar compra.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova compra para estoque</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rp-supplier">Fornecedor *</Label>
              <select
                id="rp-supplier"
                {...register("supplier_id")}
                aria-invalid={!!errors.supplier_id}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecione...</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
              {errors.supplier_id && (
                <p className="text-xs text-destructive">{errors.supplier_id.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rp-expected">Previsão no fornecedor</Label>
              <Input id="rp-expected" type="date" {...register("expected_date")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rp-alloc">Rateio dos custos adicionais</Label>
            <select
              id="rp-alloc"
              {...register("allocation_method")}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {ALLOCATION_METHODS.map((m) => (
                <option key={m} value={m}>
                  {ALLOCATION_METHOD_LABELS[m]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Produtos *</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => append(EMPTY_LINE)}>
                <Plus className="h-3.5 w-3.5" />
                Linha
              </Button>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => {
                const lineErrors = errors.items?.[index];
                return (
                  <div key={field.id} className="grid grid-cols-[1fr_5rem_7rem_auto] items-start gap-2">
                    <div>
                      <select
                        {...register(`items.${index}.product_id`)}
                        aria-invalid={!!lineErrors?.product_id}
                        onChange={(e) => {
                          setValue(`items.${index}.product_id`, e.target.value, { shouldValidate: true });
                          const p = produtos.find((x) => x.id === e.target.value);
                          if (p?.custo_referencia) setValue(`items.${index}.unit_cost`, p.custo_referencia);
                        }}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="">Produto...</option>
                        {produtos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                      {lineErrors?.product_id && (
                        <p className="text-xs text-destructive">{lineErrors.product_id.message}</p>
                      )}
                    </div>
                    <div>
                      <Input
                        inputMode="decimal"
                        placeholder="Qtd"
                        {...register(`items.${index}.quantity`)}
                        aria-invalid={!!lineErrors?.quantity}
                        className="h-8 text-right"
                      />
                      {lineErrors?.quantity && (
                        <p className="text-xs text-destructive">{lineErrors.quantity.message}</p>
                      )}
                    </div>
                    <div>
                      <Controller
                        control={control}
                        name={`items.${index}.unit_cost`}
                        render={({ field: f }) => (
                          <MoneyInput value={f.value ?? 0} onChange={f.onChange} className="h-8 text-right" />
                        )}
                      />
                      {lineErrors?.unit_cost && (
                        <p className="text-xs text-destructive">{lineErrors.unit_cost.message}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      title="Remover linha"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
            {errors.items?.message && (
              <p className="text-xs text-destructive">{errors.items.message}</p>
            )}
            {errors.items?.root?.message && (
              <p className="text-xs text-destructive">{errors.items.root.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rp-notes">Observações</Label>
            <Textarea id="rp-notes" {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar compra
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
