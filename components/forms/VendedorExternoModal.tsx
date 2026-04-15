"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import type { VendedorExterno } from "@/lib/types";
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

const vendedorExternoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  telefone: z.string(),
  observacoes: z.string(),
});

type VendedorExternoFormData = z.infer<typeof vendedorExternoSchema>;

interface VendedorExternoModalProps {
  open: boolean;
  onClose: () => void;
  vendedorExterno?: VendedorExterno;
  onSuccess: () => void;
}

export function VendedorExternoModal({
  open,
  onClose,
  vendedorExterno,
  onSuccess,
}: VendedorExternoModalProps) {
  const isEdit = !!vendedorExterno;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VendedorExternoFormData>({
    resolver: zodResolver(vendedorExternoSchema),
  });

  useEffect(() => {
    if (open) {
      reset(
        vendedorExterno
          ? {
              nome: vendedorExterno.nome,
              telefone: vendedorExterno.telefone ?? "",
              observacoes: vendedorExterno.observacoes ?? "",
            }
          : { nome: "", telefone: "", observacoes: "" },
      );
    }
  }, [open, vendedorExterno, reset]);

  async function onSubmit(data: VendedorExternoFormData) {
    try {
      if (isEdit) {
        await api.put(`/vendedores-externos/${vendedorExterno.id}`, data);
        toast.success("Vendedor externo atualizado com sucesso.");
      } else {
        await api.post("/vendedores-externos", data);
        toast.success("Vendedor externo criado com sucesso.");
      }
      onSuccess();
      onClose();
    } catch (err) {
      const message =
        err instanceof APIError
          ? err.message
          : "Erro ao salvar vendedor externo.";
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Vendedor Externo" : "Novo Vendedor Externo"}
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
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" {...register("telefone")} />
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
