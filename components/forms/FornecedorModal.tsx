"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import { SUPPLIER_KINDS, SUPPLIER_KIND_LABELS } from "@/lib/formatters";
import type { Fornecedor } from "@/lib/types";
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
import { Loader2 } from "lucide-react";

const fornecedorSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  kind: z.enum(["STONE", "TRANSPORT", "LABOR", "TAX_AUTHORITY", "OTHER"]),
  cidade: z.string(),
  telefone: z.string(),
  observacoes: z.string(),
});

type FornecedorFormData = z.infer<typeof fornecedorSchema>;

interface FornecedorModalProps {
  open: boolean;
  onClose: () => void;
  fornecedor?: Fornecedor;
  onSuccess: () => void;
}

export function FornecedorModal({
  open,
  onClose,
  fornecedor,
  onSuccess,
}: FornecedorModalProps) {
  const isEdit = !!fornecedor;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FornecedorFormData>({
    resolver: zodResolver(fornecedorSchema),
  });

  useEffect(() => {
    if (open) {
      reset(
        fornecedor
          ? {
              nome: fornecedor.nome,
              kind: fornecedor.kind ?? "STONE",
              cidade: fornecedor.cidade ?? "",
              telefone: fornecedor.telefone ?? "",
              observacoes: fornecedor.observacoes ?? "",
            }
          : { nome: "", kind: "STONE", cidade: "", telefone: "", observacoes: "" },
      );
    }
  }, [open, fornecedor, reset]);

  async function onSubmit(data: FornecedorFormData) {
    try {
      if (isEdit) {
        await api.put(`/fornecedores/${fornecedor.id}`, data);
        toast.success("Fornecedor atualizado com sucesso.");
      } else {
        await api.post("/fornecedores", data);
        toast.success("Fornecedor criado com sucesso.");
      }
      onSuccess();
      onClose();
    } catch (err) {
      const message =
        err instanceof APIError ? err.message : "Erro ao salvar fornecedor.";
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar fornecedor / prestador" : "Novo fornecedor / prestador"}
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
            <Label htmlFor="kind">Tipo *</Label>
            <select
              id="kind"
              {...register("kind")}
              className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {SUPPLIER_KINDS.map((k) => (
                <option key={k} value={k}>
                  {SUPPLIER_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" {...register("cidade")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" {...register("telefone")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" {...register("observacoes")} />
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
