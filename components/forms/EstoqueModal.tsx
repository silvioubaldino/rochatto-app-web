"use client";

import { useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { api, APIError } from "@/lib/api";
import type { EstoqueEntrada } from "@/lib/types";
import { useProdutos } from "@/hooks/useProdutos";
import { useFornecedores } from "@/hooks/useFornecedores";
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
import { formatMoeda } from "@/lib/formatters";

const estoqueSchema = z.object({
  produto_id: z.string().optional(),
  produto_nome: z.string().min(1, "Produto é obrigatório"),
  fornecedor_id: z.string().optional(),
  fornecedor_nome: z.string().optional(),
  quantidade: z.number().positive("Quantidade deve ser maior que 0"),
  custo_unit: z.number().min(0, "Custo deve ser >= 0"),
  data_entrada: z.string().min(1, "Data é obrigatória"),
  observacoes: z.string().optional(),
});

type EstoqueFormData = z.infer<typeof estoqueSchema>;

interface EstoqueModalProps {
  open: boolean;
  onClose: () => void;
  entrada?: EstoqueEntrada;
  onSuccess: () => void;
}

export function EstoqueModal({
  open,
  onClose,
  entrada,
  onSuccess,
}: EstoqueModalProps) {
  const isEdit = !!entrada;
  const { produtos } = useProdutos();
  const { fornecedores } = useFornecedores();

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EstoqueFormData>({
    resolver: zodResolver(estoqueSchema),
    defaultValues: {
      quantidade: 0,
      custo_unit: 0,
      data_entrada: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const quantidade = useWatch({ control, name: "quantidade" }) ?? 0;
  const custo_unit = useWatch({ control, name: "custo_unit" }) ?? 0;
  const totalEntrada = quantidade * custo_unit;

  useEffect(() => {
    if (open) {
      if (entrada) {
        reset({
          produto_id: entrada.produto_id ?? "",
          produto_nome: entrada.produto_nome,
          fornecedor_id: entrada.fornecedor_id ?? "",
          fornecedor_nome: entrada.fornecedor_nome ?? "",
          quantidade: entrada.quantidade_entrada,
          custo_unit: entrada.custo_unit,
          data_entrada: entrada.data_entrada.slice(0, 10),
          observacoes: entrada.observacoes ?? "",
        });
      } else {
        reset({
          produto_id: "",
          produto_nome: "",
          fornecedor_id: "",
          fornecedor_nome: "",
          quantidade: 0,
          custo_unit: 0,
          data_entrada: format(new Date(), "yyyy-MM-dd"),
          observacoes: "",
        });
      }
    }
  }, [open, entrada, reset]);

  async function onSubmit(data: EstoqueFormData) {
    const payload = {
      produto_id: data.produto_id || undefined,
      produto_nome: data.produto_nome,
      fornecedor_id: data.fornecedor_id || undefined,
      fornecedor_nome: data.fornecedor_nome || undefined,
      quantidade_entrada: data.quantidade,
      custo_unit: data.custo_unit,
      data_entrada: data.data_entrada,
      observacoes: data.observacoes || undefined,
    };

    try {
      if (isEdit) {
        await api.put(`/estoque/${entrada.id}`, payload);
        toast.success("Entrada atualizada com sucesso.");
      } else {
        await api.post("/estoque", payload);
        toast.success("Entrada registrada com sucesso.");
      }
      onSuccess();
      onClose();
    } catch (err) {
      const message =
        err instanceof APIError ? err.message : "Erro ao salvar entrada.";
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Entrada de Estoque" : "Nova Entrada de Estoque"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Produto */}
          <div className="space-y-2">
            <Label htmlFor="produto_nome">Produto *</Label>
            <Input
              id="produto_nome"
              list="produtos-list"
              placeholder="Buscar ou digitar nome do produto"
              {...register("produto_nome")}
              onChange={(e) => {
                const val = e.target.value;
                setValue("produto_nome", val);
                const found = produtos.find(
                  (p) => p.nome.toLowerCase() === val.toLowerCase(),
                );
                setValue("produto_id", found?.id ?? "");
              }}
              aria-invalid={!!errors.produto_nome}
            />
            <datalist id="produtos-list">
              {produtos.map((p) => (
                <option key={p.id} value={p.nome} />
              ))}
            </datalist>
            {errors.produto_nome && (
              <p className="text-xs text-destructive">
                {errors.produto_nome.message}
              </p>
            )}
          </div>

          {/* Fornecedor */}
          <div className="space-y-2">
            <Label htmlFor="fornecedor_nome">Fornecedor</Label>
            <Input
              id="fornecedor_nome"
              list="fornecedores-list"
              placeholder="Buscar ou digitar fornecedor"
              {...register("fornecedor_nome")}
              onChange={(e) => {
                const val = e.target.value;
                setValue("fornecedor_nome", val);
                const found = fornecedores.find(
                  (f) => f.nome.toLowerCase() === val.toLowerCase(),
                );
                setValue("fornecedor_id", found?.id ?? "");
              }}
            />
            <datalist id="fornecedores-list">
              {fornecedores.map((f) => (
                <option key={f.id} value={f.nome} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Quantidade */}
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                step="0.01"
                min="0.01"
                {...register("quantidade", { valueAsNumber: true })}
                aria-invalid={!!errors.quantidade}
              />
              {errors.quantidade && (
                <p className="text-xs text-destructive">
                  {errors.quantidade.message}
                </p>
              )}
            </div>

            {/* Custo Unitário */}
            <div className="space-y-2">
              <Label htmlFor="custo_unit">Custo Unitário *</Label>
              <Controller
                control={control}
                name="custo_unit"
                render={({ field }) => (
                  <MoneyInput
                    id="custo_unit"
                    value={field.value ?? 0}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.custo_unit && (
                <p className="text-xs text-destructive">
                  {errors.custo_unit.message}
                </p>
              )}
            </div>
          </div>

          {/* Preview total */}
          <div className="rounded-md bg-muted px-3 py-2 text-sm font-medium">
            Total da entrada:{" "}
            <span className="font-bold">{formatMoeda(totalEntrada)}</span>
          </div>

          {/* Data de Entrada */}
          <div className="space-y-2">
            <Label htmlFor="data_entrada">Data de Entrada *</Label>
            <Input
              id="data_entrada"
              type="date"
              {...register("data_entrada")}
              aria-invalid={!!errors.data_entrada}
            />
            {errors.data_entrada && (
              <p className="text-xs text-destructive">
                {errors.data_entrada.message}
              </p>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" rows={2} {...register("observacoes")} />
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
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {isEdit ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
