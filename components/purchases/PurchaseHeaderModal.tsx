"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api, APIError } from "@/lib/api";
import type { PurchaseDetail } from "@/lib/types";
import {
  purchaseHeaderSchema,
  toPurchaseHeaderPayload,
  type PurchaseHeaderFormData,
} from "@/lib/schemas";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface PurchaseHeaderModalProps {
  open: boolean;
  onClose: () => void;
  purchase: PurchaseDetail;
  onSuccess: () => void;
}

/** PUT /purchases/{id} — previsão no fornecedor e observações. */
export function PurchaseHeaderModal({ open, onClose, purchase, onSuccess }: PurchaseHeaderModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<PurchaseHeaderFormData>({ resolver: zodResolver(purchaseHeaderSchema) });

  useEffect(() => {
    if (open) {
      reset({
        expected_date: purchase.expected_date?.slice(0, 10) ?? "",
        notes: purchase.notes ?? "",
      });
    }
  }, [open, purchase, reset]);

  async function onSubmit(data: PurchaseHeaderFormData) {
    try {
      await api.put(`/purchases/${purchase.id}`, toPurchaseHeaderPayload(data, purchase.allocation_method));
      toast.success("Compra atualizada.");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao salvar compra.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar compra</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ph-expected">Previsão no fornecedor</Label>
            <Input id="ph-expected" type="date" {...register("expected_date")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ph-notes">Observações</Label>
            <Textarea id="ph-notes" {...register("notes")} />
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
