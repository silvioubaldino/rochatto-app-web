"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api, APIError } from "@/lib/api";
import {
  obligationPatchSchema,
  toObligationPatchPayload,
  type ObligationPatchFormData,
} from "@/lib/schemas";
import type { Obligation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ObligationPatchDialogProps {
  open: boolean;
  onClose: () => void;
  obligation: Pick<Obligation, "id" | "due_date" | "notes">;
  onDone: () => void;
}

/** Prazo final e observações: `PATCH /obligations/{id}` só com o que mudou. */
export function ObligationPatchDialog({ open, onClose, obligation, onDone }: ObligationPatchDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ObligationPatchFormData>({ resolver: zodResolver(obligationPatchSchema) });

  useEffect(() => {
    if (open) reset({ due_date: obligation.due_date?.slice(0, 10) ?? "", notes: obligation.notes ?? "" });
  }, [open, obligation.due_date, obligation.notes, reset]);

  async function onSubmit(data: ObligationPatchFormData) {
    const payload = toObligationPatchPayload(data, obligation);
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    try {
      await api.patch(`/obligations/${obligation.id}`, payload);
      toast.success("Conta atualizada.");
      onDone();
      onClose();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao salvar a conta.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Prazo e observações</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ob-due">Prazo final</Label>
            <Input id="ob-due" type="date" {...register("due_date")} />
            <p className="text-xs text-muted-foreground">Vazio remove o prazo.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ob-notes">Observações</Label>
            <Textarea id="ob-notes" {...register("notes")} />
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
