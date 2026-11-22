"use client";

import type {
  PurchaseStatus,
  SaleDeliveryStatus,
  SalePaymentStatus,
  ObligationStatus,
  InstallmentStatus,
} from "@/lib/types";
import { StatusBadge } from "@/components/patterns/StatusBadge";

// Atalhos legados dos badges de status: todos delegam ao `StatusBadge` (mapa único de
// rótulo e tom em lib/format/tones.ts). Código novo usa `<StatusBadge kind value />`.

/** `serviceOnly`: Sale só de serviço lê "A executar / Executado" (AYD-010 §3). */
export function SaleDeliveryBadge({
  status,
  serviceOnly = false,
}: {
  status: SaleDeliveryStatus;
  serviceOnly?: boolean;
}) {
  return <StatusBadge kind="saleDelivery" value={status} serviceOnly={serviceOnly} title="Status de entrega" />;
}

export function SalePaymentBadge({ status }: { status: SalePaymentStatus }) {
  return <StatusBadge kind="salePayment" value={status} title="Status de pagamento" />;
}

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  return <StatusBadge kind="purchase" value={status} title="Status da compra" />;
}

export function ObligationStatusBadge({ status }: { status: ObligationStatus }) {
  return <StatusBadge kind="obligation" value={status} title="Status da conta" />;
}

export function InstallmentStatusBadge({ status }: { status: InstallmentStatus }) {
  return <StatusBadge kind="installment" value={status} title="Status da parcela" />;
}

export function OverdueBadge() {
  return (
    <StatusBadge tone="danger" title="Conta vencida">
      Vencida
    </StatusBadge>
  );
}
