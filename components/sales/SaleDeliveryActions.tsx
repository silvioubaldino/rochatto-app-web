"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import type { SaleDeliveryStatus } from "@/lib/types";
import { saleDeliveryLabel } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";

interface SaleDeliveryActionsProps {
  vendaId: string;
  status: SaleDeliveryStatus;
  /** Sale só de serviço: rótulos A executar / Executado (AYD-010 §3). */
  serviceOnly?: boolean;
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
export function SaleDeliveryActions({ vendaId, status, serviceOnly = false, onChanged }: SaleDeliveryActionsProps) {
  const [pending, setPending] = useState<PendingAction>(null);

  if (status === "CANCELED") return null;

  function open(action: SaleDeliveryStatus) {
    setPending(action);
  }

  // Erros (409: item em compra pedida/recebida) sobem para o ConfirmDialog e aparecem NO diálogo.
  async function confirm() {
    if (!pending) return;
    await api.patch(`/vendas/${vendaId}/delivery-status`, { delivery_status: pending });
    toast.success(`Venda: ${saleDeliveryLabel(pending, serviceOnly)}.`);
    onChanged();
  }

  const base = pending ? CONFIRM_TEXT[pending] : null;
  const text =
    base && serviceOnly && pending !== "CANCELED"
      ? pending === "DELIVERED"
        ? { title: "Marcar como executado", description: "Confirma que o serviço foi executado?", cta: "Marcar como executado" }
        : { title: "Voltar para a executar", description: "A venda volta para o status \"A executar\".", cta: "Voltar para a executar" }
      : base;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {status === "TO_DELIVER" && (
          <Button size="sm" onClick={() => open("DELIVERED")}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {serviceOnly ? "Marcar como executado" : "Marcar como entregue"}
          </Button>
        )}
        {status === "DELIVERED" && (
          <Button size="sm" variant="outline" onClick={() => open("TO_DELIVER")}>
            <RotateCcw className="h-3.5 w-3.5" />
            {serviceOnly ? "Voltar para a executar" : "Voltar para a entregar"}
          </Button>
        )}
        <Button size="sm" variant="destructive" onClick={() => open("CANCELED")}>
          <Ban className="h-3.5 w-3.5" />
          Cancelar venda
        </Button>
      </div>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={text?.title ?? ""}
        description={text?.description}
        confirmLabel={text?.cta}
        tone={pending === "CANCELED" ? "danger" : "default"}
        onConfirm={confirm}
      />
    </>
  );
}
