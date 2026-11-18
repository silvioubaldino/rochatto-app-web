"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2, Loader2, RotateCcw, AlertTriangle } from "lucide-react";
import { api, APIError } from "@/lib/api";
import type { SaleDeliveryStatus } from "@/lib/types";
import { SALE_DELIVERY_STATUS_LABELS } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SaleDeliveryActionsProps {
  vendaId: string;
  status: SaleDeliveryStatus;
  onChanged: () => void;
}

type PendingAction = SaleDeliveryStatus | null;

const CONFIRM_TEXT: Record<SaleDeliveryStatus, { title: string; description: string; cta: string }> = {
  DELIVERED: {
    title: "Marcar como entregue",
    description: "Confirma que a venda foi entregue ao cliente?",
    cta: "Marcar como entregue",
  },
  TO_DELIVER: {
    title: "Voltar para a entregar",
    description: "A venda volta para o status \"A entregar\".",
    cta: "Voltar para a entregar",
  },
  CANCELED: {
    title: "Cancelar venda",
    description:
      "A venda cancelada sai dos totais, do lucro, do \"a receber\", da fila de compras e das saídas de estoque. " +
      "Itens em compras abertas são liberados. Só é possível se nenhum item estiver numa compra pedida ou recebida. " +
      "O cancelamento é definitivo e os recebimentos já registrados ficam como estão.",
    cta: "Cancelar venda",
  },
};

/** Status de entrega da Sale (manual) e cancelamento — PATCH /vendas/{id}/delivery-status. */
export function SaleDeliveryActions({ vendaId, status, onChanged }: SaleDeliveryActionsProps) {
  const [pending, setPending] = useState<PendingAction>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "CANCELED") return null;

  function open(action: SaleDeliveryStatus) {
    setError(null);
    setPending(action);
  }

  async function confirm() {
    if (!pending) return;
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/vendas/${vendaId}/delivery-status`, { delivery_status: pending });
      toast.success(`Venda: ${SALE_DELIVERY_STATUS_LABELS[pending]}.`);
      setPending(null);
      onChanged();
    } catch (err) {
      const message = err instanceof APIError ? err.message : "Erro ao atualizar o status.";
      // 409 (ex.: item em compra pedida/recebida) fica visível no próprio diálogo.
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const text = pending ? CONFIRM_TEXT[pending] : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {status === "TO_DELIVER" && (
          <Button size="sm" onClick={() => open("DELIVERED")}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            Marcar como entregue
          </Button>
        )}
        {status === "DELIVERED" && (
          <Button size="sm" variant="outline" onClick={() => open("TO_DELIVER")}>
            <RotateCcw className="h-3.5 w-3.5" />
            Voltar para a entregar
          </Button>
        )}
        <Button size="sm" variant="destructive" onClick={() => open("CANCELED")}>
          <Ban className="h-3.5 w-3.5" />
          Cancelar venda
        </Button>
      </div>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && !loading && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle
              className={pending === "CANCELED" ? "flex items-center gap-2 text-destructive" : undefined}
            >
              {pending === "CANCELED" && <AlertTriangle className="h-5 w-5" />}
              {text?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>{text?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Voltar</AlertDialogCancel>
            <Button
              variant={pending === "CANCELED" ? "destructive" : "default"}
              onClick={confirm}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {text?.cta}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
