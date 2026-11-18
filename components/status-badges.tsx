"use client";

import type {
  PurchaseStatus,
  SaleDeliveryStatus,
  SalePaymentStatus,
  SupplierPaymentStatus,
} from "@/lib/types";
import {
  PURCHASE_STATUS_COLORS,
  PURCHASE_STATUS_LABELS,
  SALE_DELIVERY_STATUS_COLORS,
  SALE_DELIVERY_STATUS_LABELS,
  SALE_PAYMENT_STATUS_COLORS,
  SALE_PAYMENT_STATUS_LABELS,
  SUPPLIER_PAYMENT_STATUS_COLORS,
  SUPPLIER_PAYMENT_STATUS_LABELS,
} from "@/lib/formatters";
import { StatusBadge } from "@/components/ui/StatusBadge";

// Badges dos status do AYD-002 (rótulo + cor vindos dos mapas de lib/formatters.ts).

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

export function SupplierPaymentBadge({ status }: { status: SupplierPaymentStatus }) {
  return (
    <StatusBadge
      label={SUPPLIER_PAYMENT_STATUS_LABELS[status] ?? "—"}
      colorClassName={SUPPLIER_PAYMENT_STATUS_COLORS[status] ?? ""}
      title="Pagamento ao fornecedor"
    />
  );
}
