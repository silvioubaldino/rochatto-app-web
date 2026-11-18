"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api, APIError } from "@/lib/api";
import { useFornecedores } from "@/hooks/useFornecedores";
import { usePartners } from "@/hooks/usePartners";
import { SALE_COST_KINDS, SALE_COST_KIND_LABELS } from "@/lib/formatters";
import type { SaleCost } from "@/lib/types";
import { saleCostSchema, toSaleCostPayload, type SaleCostFormData } from "@/lib/schemas";
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

interface SaleCostModalProps {
  open: boolean;
  onClose: () => void;
  saleId: string;
  /** Partner indicador da Sale: credor padrão da COMMISSION (AYD-009 §2). */
  defaultPartnerId?: string;
  cost?: SaleCost;
  onSuccess: (warnings: string[]) => void;
}

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

export function SaleCostModal({
  open,
  onClose,
  saleId,
  defaultPartnerId,
  cost,
  onSuccess,
}: SaleCostModalProps) {
  const { fornecedores } = useFornecedores();
  const { partners } = usePartners();
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SaleCostFormData>({ resolver: zodResolver(saleCostSchema) });

  useEffect(() => {
    if (!open) return;
    reset(
      cost
        ? {
            kind: cost.kind,
            amount: cost.amount,
            description: cost.description ?? "",
            payee_id: cost.payee?.id ?? "",
          }
        : { kind: "FREIGHT", amount: 0, description: "", payee_id: "" },
    );
  }, [open, cost, reset]);

  const kind = watch("kind");
  const isCommission = kind === "COMMISSION";

  function onKindChange(next: SaleCostFormData["kind"]) {
    setValue("kind", next);
    // O credor de COMMISSION é Partner; os demais, Supplier — a escolha anterior não vale.
    setValue("payee_id", next === "COMMISSION" ? (defaultPartnerId ?? "") : "");
  }

  async function onSubmit(data: SaleCostFormData) {
    const payload = toSaleCostPayload(data, cost?.sale_item_id);
    try {
      const res = cost
        ? await api.put<SaleCost>(`/vendas/${saleId}/costs/${cost.id}`, payload)
        : await api.post<SaleCost>(`/vendas/${saleId}/costs`, payload);
      toast.success(cost ? "Custo atualizado." : "Custo lançado.");
      onSuccess(res?.warnings ?? []);
      onClose();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao salvar custo.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{cost ? "Editar custo da venda" : "Novo custo da venda"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cost-kind">Tipo *</Label>
            <select
              id="cost-kind"
              value={kind ?? "FREIGHT"}
              onChange={(e) => onKindChange(e.target.value as SaleCostFormData["kind"])}
              className={selectClass}
            >
              {SALE_COST_KINDS.map((k) => (
                <option key={k} value={k}>
                  {SALE_COST_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost-amount">Valor previsto *</Label>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <MoneyInput id="cost-amount" value={field.value ?? 0} onChange={field.onChange} />
              )}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost-payee">{isCommission ? "Credor (parceiro)" : "Credor (fornecedor/prestador)"}</Label>
            <select id="cost-payee" {...register("payee_id")} className={selectClass}>
              <option value="">A definir</option>
              {isCommission
                ? partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                : fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost-desc">Descrição</Label>
            <Input id="cost-desc" {...register("description")} />
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
