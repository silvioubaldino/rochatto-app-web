"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import type { Cliente } from "@/lib/types";
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

const clienteSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(200, "Máximo 200 caracteres"),
  telefone: z.string(),
  email: z.string().email("E-mail inválido").or(z.literal("")),
  endereco: z.string(),
  cidade: z.string(),
  observacoes: z.string(),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

interface ClienteModalProps {
  open: boolean;
  onClose: () => void;
  cliente?: Cliente;
  onSuccess: () => void;
}

export function ClienteModal({
  open,
  onClose,
  cliente,
  onSuccess,
}: ClienteModalProps) {
  const isEdit = !!cliente;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
  });

  useEffect(() => {
    if (open) {
      reset(
        cliente
          ? {
              nome: cliente.nome,
              telefone: cliente.telefone ?? "",
              email: cliente.email ?? "",
              endereco: cliente.endereco ?? "",
              cidade: cliente.cidade ?? "",
              observacoes: cliente.observacoes ?? "",
            }
          : {
              nome: "",
              telefone: "",
              email: "",
              endereco: "",
              cidade: "",
              observacoes: "",
            },
      );
    }
  }, [open, cliente, reset]);

  async function onSubmit(data: ClienteFormData) {
    try {
      if (isEdit) {
        await api.put(`/clientes/${cliente.id}`, data);
        toast.success("Cliente atualizado com sucesso.");
      } else {
        await api.post("/clientes", data);
        toast.success("Cliente criado com sucesso.");
      }
      onSuccess();
      onClose();
    } catch (err) {
      const message =
        err instanceof APIError ? err.message : "Erro ao salvar cliente.";
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Cliente" : "Novo Cliente"}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" {...register("telefone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" {...register("endereco")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" {...register("cidade")} />
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
