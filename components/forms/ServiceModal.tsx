"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import { serviceSchema, toServicePayload, type ServiceFormData } from "@/lib/schemas";
import type { Service } from "@/lib/types";
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

interface ServiceModalProps {
  open: boolean;
  onClose: () => void;
  service?: Service;
  onSuccess: () => void;
}

/** Cadastro de Service (AYD-010 §1): nome, unidade livre, preço e custo de referência. */
export function ServiceModal({ open, onClose, service, onSuccess }: ServiceModalProps) {
  const isEdit = !!service;
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormData>({ resolver: zodResolver(serviceSchema) });

  useEffect(() => {
    if (open) {
      reset({
        name: service?.name ?? "",
        unit: service?.unit ?? "",
        reference_price: service?.reference_price ?? 0,
        reference_cost: service?.reference_cost ?? 0,
        notes: service?.notes ?? "",
      });
    }
  }, [open, service, reset]);

  async function onSubmit(data: ServiceFormData) {
    try {
      const payload = toServicePayload(data);
      if (isEdit) {
        await api.put(`/services/${service.id}`, payload);
        toast.success("Serviço atualizado com sucesso.");
      } else {
        await api.post("/services", payload);
        toast.success("Serviço criado com sucesso.");
      }
      onSuccess();
      onClose();
    } catch (err) {
      // 409: nome já usado por outro Serviço ativo.
      toast.error(err instanceof APIError ? err.message : "Erro ao salvar serviço.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service-name">Nome *</Label>
            <Input id="service-name" {...register("name")} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-unit">Unidade</Label>
            <Input id="service-unit" placeholder="m², un, hora, visita..." {...register("unit")} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preço de referência</Label>
              <Controller
                control={control}
                name="reference_price"
                render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />}
              />
            </div>
            <div className="space-y-2">
              <Label>Custo de referência</Label>
              <Controller
                control={control}
                name="reference_cost"
                render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-notes">Observações</Label>
            <Textarea id="service-notes" {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
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
