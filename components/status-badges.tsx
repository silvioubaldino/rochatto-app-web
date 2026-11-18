"use client";

import type {
  PurchaseStatus,
  SaleDeliveryStatus,
  SalePaymentStatus,
  ObligationStatus,
  InstallmentStatus,
} from "@/lib/types";
import {
  PURCHASE_STATUS_COLORS,
  PURCHASE_STATUS_LABELS,
  SALE_DELIVERY_STATUS_COLORS,
  SALE_DELIVERY_STATUS_LABELS,
  SALE_PAYMENT_STATUS_COLORS,
  SALE_PAYMENT_STATUS_LABELS,
  OBLIGATION_STATUS_COLORS,
  OBLIGATION_STATUS_LABELS,
  INSTALLMENT_STATUS_COLORS,
  INSTALLMENT_STATUS_LABELS,
} from "@/lib/formatters";
import { StatusBadge } from "@/components/ui/StatusBadge";

// Badges dos status do AYD-002 e AYD-007 (rótulo + cor vindos dos mapas de lib/formatters.ts).

export function SaleDeliveryBadge({ status }: { status: SaleDeliveryStatus }) {
  return (
    <StatusBadge
      label={SALE_DELIVERY_STATUS_LABELS[status] ?? "—"}
      colorClassName={SALE_DELIVERY_STATUS_COLORS[status] ?? ""}
      title="Status de entrega"
    />
  );
}

export function SalePaymentBadge({ status }: { status: SalePaymentStatus }) {
  return (
    <StatusBadge
      label={SALE_PAYMENT_STATUS_LABELS[status] ?? "—"}
      colorClassName={SALE_PAYMENT_STATUS_COLORS[status] ?? ""}
      title="Status de pagamento"
    />
  );
}

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  return (
    <StatusBadge
      label={PURCHASE_STATUS_LABELS[status] ?? "—"}
      colorClassName={PURCHASE_STATUS_COLORS[status] ?? ""}
      title="Status da compra"
    />
  );
}

export function ObligationStatusBadge({ status }: { status: ObligationStatus }) {
  return (
    <StatusBadge
      label={OBLIGATION_STATUS_LABELS[status] ?? "—"}
      colorClassName={OBLIGATION_STATUS_COLORS[status] ?? ""}
      title="Status da conta"
    />
  );
}

export function InstallmentStatusBadge({ status }: { status: InstallmentStatus }) {
  return (
    <StatusBadge
      label={INSTALLMENT_STATUS_LABELS[status] ?? "—"}
      colorClassName={INSTALLMENT_STATUS_COLORS[status] ?? ""}
      title="Status da parcela"
    />
  );
}

export function OverdueBadge() {
  return <StatusBadge label="Vencida" colorClassName="bg-red-100 text-red-800" title="Conta vencida" />;
}
