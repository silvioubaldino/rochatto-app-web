"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import type { Produto } from "@/lib/types";
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

const produtoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string(),
  preco_referencia: z.number().min(0, "Valor deve ser >= 0"),
  custo_referencia: z.number().min(0, "Valor deve ser >= 0"),
  unidade: z.string(),
});

type ProdutoFormData = z.infer<typeof produtoSchema>;

interface ProdutoModalProps {
  open: boolean;
  onClose: () => void;
  produto?: Produto;
  onSuccess: () => void;
}

export function ProdutoModal({
  open,
  onClose,
  produto,
  onSuccess,
}: ProdutoModalProps) {
  const isEdit = !!produto;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoSchema),
  });

  useEffect(() => {
    if (open) {
      reset(
        produto
          ? {
              nome: produto.nome,
              descricao: produto.descricao ?? "",
              preco_referencia: produto.preco_referencia ?? 0,
              custo_referencia: produto.custo_referencia ?? 0,
              unidade: produto.unidade ?? "",
            }
          : {
              nome: "",
              descricao: "",
              preco_referencia: 0,
              custo_referencia: 0,
              unidade: "",
            },
      );
    }
  }, [open, produto, reset]);

  async function onSubmit(data: ProdutoFormData) {
    try {
      if (isEdit) {
        await api.put(`/produtos/${produto.id}`, data);
        toast.success("Produto atualizado com sucesso.");
      } else {
        await api.post("/produtos", data);
        toast.success("Produto criado com sucesso.");
      }
      onSuccess();
      onClose();
    } catch (err) {
      const message =
        err instanceof APIError ? err.message : "Erro ao salvar produto.";
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" {...register("nome")} aria-invalid={!!errors.nome} />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" {...register("descricao")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preco_referencia">Preço de Referência</Label>
              <Controller
                control={control}
                name="preco_referencia"
                render={({ field }) => (
                  <MoneyInput
                    id="preco_referencia"
                    value={field.value ?? 0}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.preco_referencia && (
                <p className="text-xs text-destructive">
                  {errors.preco_referencia.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="custo_referencia">Custo de Referência</Label>
              <Controller
                control={control}
                name="custo_referencia"
                render={({ field }) => (
                  <MoneyInput
                    id="custo_referencia"
                    value={field.value ?? 0}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.custo_referencia && (
                <p className="text-xs text-destructive">
                  {errors.custo_referencia.message}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Estes valores são apenas referência. O preço real é definido em cada
            venda.
          </p>

          <div className="space-y-2">
            <Label htmlFor="unidade">Unidade</Label>
            <Input
              id="unidade"
              placeholder="ex: m², peça, kg"
              {...register("unidade")}
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
              {isEdit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
