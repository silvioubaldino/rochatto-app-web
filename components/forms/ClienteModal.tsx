"use client";

import { useEffect } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import type { Cliente } from "@/lib/types";
import { clienteSchema, toClientePayload, type ClienteFormData } from "@/lib/schemas";
import { LEAD_SOURCES, LEAD_SOURCE_LABELS, PARTNER_TYPE_LABELS } from "@/lib/formatters";
import { usePartners } from "@/hooks/usePartners";
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
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
  });

  const leadSource = useWatch({ control, name: "lead_source" });
  const { partners } = usePartners();
  // Partner excluído (soft-delete) ainda vinculado ao Customer: mantém a opção visível.
  const inactiveReferrer =
    cliente?.referrer_id && !partners.some((p) => p.id === cliente.referrer_id)
      ? { id: cliente.referrer_id, name: cliente.referrer_name ?? "Parceiro" }
      : null;

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
              lead_source: cliente.lead_source ?? "",
              referrer_id: cliente.referrer_id ?? "",
            }
          : {
              nome: "",
              telefone: "",
              email: "",
              endereco: "",
              cidade: "",
              observacoes: "",
              lead_source: "",
              referrer_id: "",
            },
      );
    }
  }, [open, cliente, reset]);

  async function onSubmit(data: ClienteFormData) {
    try {
      const payload = toClientePayload(data);
      if (isEdit) {
        await api.put(`/clientes/${cliente.id}`, payload);
        toast.success("Cliente atualizado com sucesso.");
      } else {
        await api.post("/clientes", payload);
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lead_source">Origem</Label>
              <Controller
                control={control}
                name="lead_source"
                render={({ field }) => (
                  <select
                    id="lead_source"
                    name={field.name}
                    ref={field.ref}
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      // referrer_id só existe com origem Parceiro (regra da API).
                      if (e.target.value !== "PARTNER") {
                        setValue("referrer_id", "", { shouldValidate: false });
                      }
                    }}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Não informada</option>
                    {LEAD_SOURCES.map((ls) => (
                      <option key={ls} value={ls}>
                        {LEAD_SOURCE_LABELS[ls]}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            {leadSource === "PARTNER" && (
              <div className="space-y-2">
                <Label htmlFor="referrer_id">Parceiro *</Label>
                <Controller
                  control={control}
                  name="referrer_id"
                  render={({ field }) => (
                    <select
                      id="referrer_id"
                      name={field.name}
                      ref={field.ref}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-invalid={!!errors.referrer_id}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Selecione...</option>
                      {inactiveReferrer && (
                        <option value={inactiveReferrer.id}>
                          {inactiveReferrer.name} (inativo)
                        </option>
                      )}
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {PARTNER_TYPE_LABELS[p.type]}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.referrer_id && (
                  <p className="text-xs text-destructive">{errors.referrer_id.message}</p>
                )}
                {partners.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum parceiro cadastrado — cadastre em Catálogos › Parceiros.
                  </p>
                )}
              </div>
            )}
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
