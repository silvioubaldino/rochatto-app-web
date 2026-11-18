"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import { formatMoeda, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/formatters";
import { receiptSchema, toReceiptPayload, type ReceiptFormData } from "@/lib/schemas";
import type { PagamentoCliente } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Loader2 } from "lucide-react";

type PagamentoFormData = ReceiptFormData;

interface PagamentoModalProps {
  open: boolean;
  onClose: () => void;
  vendaId: string;
  pagamento?: PagamentoCliente;
  totalVenda: number;
  totalRecebido: number;
  onSuccess: () => void;
}

export function PagamentoModal({
  open,
  onClose,
  vendaId,
  pagamento,
  totalVenda,
  totalRecebido,
  onSuccess,
}: PagamentoModalProps) {
  const isEdit = !!pagamento;
  const saldoPendente = totalVenda - totalRecebido;

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PagamentoFormData>({
    resolver: zodResolver(receiptSchema),
  });

  const watchTipo = watch("tipo");

  useEffect(() => {
    if (open) {
      if (pagamento) {
        reset({
          valor: pagamento.valor,
          tipo: pagamento.status === "recebido" ? "recebido" : "agendar",
          data_pagamento: pagamento.data_pagamento
            ? pagamento.data_pagamento.slice(0, 10)
            : "",
          data_agendada: pagamento.data_agendada
            ? pagamento.data_agendada.slice(0, 10)
            : "",
          payment_method: pagamento.payment_method ?? "",
          observacoes: pagamento.observacoes ?? "",
        });
      } else {
        reset({
          valor: saldoPendente > 0 ? saldoPendente : 0,
          tipo: "recebido",
          data_pagamento: format(new Date(), "yyyy-MM-dd"),
          data_agendada: "",
          payment_method: "",
          observacoes: "",
        });
      }
    }
  }, [open, pagamento, saldoPendente, reset]);

  async function onSubmit(data: PagamentoFormData) {
    const payload = toReceiptPayload(data);

    try {
      if (isEdit) {
        await api.put(`/vendas/${vendaId}/pagamentos/${pagamento.id}`, payload);
        toast.success("Pagamento atualizado.");
      } else {
        await api.post(`/vendas/${vendaId}/pagamentos`, payload);
        toast.success("Pagamento registrado.");
      }
      onSuccess();
      onClose();
    } catch (err) {
      const message =
        err instanceof APIError ? err.message : "Erro ao salvar pagamento.";
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Pagamento" : "Registrar Recebimento"}
          </DialogTitle>
        </DialogHeader>

        {!isEdit && saldoPendente > 0 && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            Saldo pendente: <strong>{formatMoeda(saldoPendente)}</strong>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Valor */}
          <div className="space-y-2">
            <Label>Valor *</Label>
            <Controller
              control={control}
              name="valor"
              render={({ field }) => (
                <MoneyInput value={field.value ?? 0} onChange={field.onChange} />
              )}
            />
            {errors.valor && (
              <p className="text-xs text-destructive">{errors.valor.message}</p>
            )}
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="recebido"
                  {...register("tipo")}
                  className="accent-primary"
                />
                Recebido
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="agendar"
                  {...register("tipo")}
                  className="accent-primary"
                />
                Agendar
              </label>
            </div>
          </div>

          {/* Data Recebimento (conditional) */}
          {watchTipo === "recebido" && (
            <div className="space-y-2">
              <Label htmlFor="data_pagamento">Data do Recebimento *</Label>
              <Input
                id="data_pagamento"
                type="date"
                {...register("data_pagamento")}
              />
              {errors.data_pagamento && (
                <p className="text-xs text-destructive">
                  {errors.data_pagamento.message}
                </p>
              )}
            </div>
          )}

          {/* Data Agendada (conditional) */}
          {watchTipo === "agendar" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="data_agendada">Data Agendada *</Label>
                <Input
                  id="data_agendada"
                  type="date"
                  {...register("data_agendada")}
                />
                {errors.data_agendada && (
                  <p className="text-xs text-destructive">
                    {errors.data_agendada.message}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Você receberá um alerta 5 dias antes desta data.
              </p>
            </>
          )}

          {/* Forma de pagamento (AYD-004): obrigatória ao receber, opcional ao agendar */}
          <div className="space-y-2">
            <Label htmlFor="payment_method">
              Forma de pagamento{watchTipo === "recebido" ? " *" : ""}
            </Label>
            <select
              id="payment_method"
              {...register("payment_method")}
              className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{watchTipo === "recebido" ? "Selecione..." : "Não informada"}</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </select>
            {errors.payment_method && (
              <p className="text-xs text-destructive">{errors.payment_method.message}</p>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="pag_obs">Observações</Label>
            <Textarea
              id="pag_obs"
              placeholder="Notas..."
              {...register("observacoes")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
