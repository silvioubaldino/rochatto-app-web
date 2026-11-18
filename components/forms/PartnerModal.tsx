"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import type { Partner } from "@/lib/types";
import { PARTNER_TYPES, PARTNER_TYPE_LABELS } from "@/lib/formatters";
import {
  partnerSchema,
  toPartnerPayload,
  type PartnerFormData,
  type PartnerFormInput,
} from "@/lib/schemas";
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

interface PartnerModalProps {
  open: boolean;
  onClose: () => void;
  partner?: Partner;
  onSuccess: () => void;
}

export function PartnerModal({ open, onClose, partner, onSuccess }: PartnerModalProps) {
  const isEdit = !!partner;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PartnerFormInput, unknown, PartnerFormData>({
    resolver: zodResolver(partnerSchema),
  });

  useEffect(() => {
    if (open) {
      reset(
        partner
          ? {
              name: partner.name,
              type: partner.type,
              phone: partner.phone ?? "",
              notes: partner.notes ?? "",
            }
          : { name: "", type: "", phone: "", notes: "" },
      );
    }
  }, [open, partner, reset]);

  async function onSubmit(data: PartnerFormData) {
    try {
      const payload = toPartnerPayload(data);
      if (isEdit) {
        await api.put(`/partners/${partner.id}`, payload);
        toast.success("Parceiro atualizado com sucesso.");
      } else {
        await api.post("/partners", payload);
        toast.success("Parceiro criado com sucesso.");
      }
      onSuccess();
      onClose();
    } catch (err) {
      const message = err instanceof APIError ? err.message : "Erro ao salvar parceiro.";
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Parceiro" : "Novo Parceiro"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="partner-name">Nome *</Label>
            <Input id="partner-name" {...register("name")} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="partner-type">Tipo *</Label>
              <select
                id="partner-type"
                {...register("type")}
                aria-invalid={!!errors.type}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecione...</option>
                {PARTNER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PARTNER_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner-phone">Telefone</Label>
              <Input id="partner-phone" {...register("phone")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="partner-notes">Observações</Label>
            <Textarea id="partner-notes" {...register("notes")} />
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
