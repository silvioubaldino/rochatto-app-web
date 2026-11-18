"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSWRConfig } from "swr";
import { Plus } from "lucide-react";
import { usePurchases, isPurchaseRelatedKey, type PurchasesFilters } from "@/hooks/usePurchases";
import { useFornecedores } from "@/hooks/useFornecedores";
import {
  PURCHASE_KINDS,
  PURCHASE_KIND_LABELS,
  PURCHASE_STATUSES,
  PURCHASE_STATUS_LABELS,
  SUPPLIER_PAYMENT_STATUSES,
  SUPPLIER_PAYMENT_STATUS_LABELS,
  formatData,
  formatMoeda,
} from "@/lib/formatters";
import type {
  PurchaseKind,
  PurchaseListItem,
  PurchaseStatus,
  SupplierPaymentStatus,
} from "@/lib/types";
import { DataTable } from "@/components/tables/DataTable";
import { PurchaseStatusBadge, SupplierPaymentBadge } from "@/components/status-badges";
import { PendingSaleItemsQueue } from "@/components/purchases/PendingSaleItemsQueue";
import { ReplenishmentPurchaseModal } from "@/components/purchases/ReplenishmentPurchaseModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | "" {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

const selectClass = "h-8 rounded-md border border-input bg-background px-3 text-sm";

// Purchases ("Compras") — AYD-002 §3: lista com filtros e fila "a comprar" por Supplier.
export default function ComprasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate } = useSWRConfig();
  const { fornecedores } = useFornecedores();

  const [tab, setTab] = useState(searchParams.get("tab") === "a-comprar" ? "a-comprar" : "compras");
  const [kind, setKind] = useState<PurchaseKind | "">(pick(searchParams.get("kind"), PURCHASE_KINDS));
  const [status, setStatus] = useState<PurchaseStatus | "">(
    pick(searchParams.get("status"), PURCHASE_STATUSES),
  );
  const [paymentStatus, setPaymentStatus] = useState<SupplierPaymentStatus | "">(
    pick(searchParams.get("payment_status"), SUPPLIER_PAYMENT_STATUSES),
  );
  const [supplierId, setSupplierId] = useState(searchParams.get("supplier_id") || "");
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");
  const [replenishmentOpen, setReplenishmentOpen] = useState(false);

  const filters = useMemo<PurchasesFilters>(
    () => ({
      kind: kind || undefined,
      status: status || undefined,
      payment_status: paymentStatus || undefined,
      supplier_id: supplierId || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [kind, status, paymentStatus, supplierId, from, to],
  );
  const { purchases, isLoading } = usePurchases(filters);

  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== "compras") params.set("tab", tab);
    if (kind) params.set("kind", kind);
    if (status) params.set("status", status);
    if (paymentStatus) params.set("payment_status", paymentStatus);
    if (supplierId) params.set("supplier_id", supplierId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    router.replace(qs ? `/compras?${qs}` : "/compras", { scroll: false });
  }, [tab, kind, status, paymentStatus, supplierId, from, to, router]);

  const totals = useMemo(
    () => ({
      cost: purchases.reduce((s, p) => s + (p.total_cost ?? 0), 0),
      toPay: purchases.reduce((s, p) => s + (p.to_pay ?? 0), 0),
    }),
    [purchases],
  );

  const columns = [
    {
      key: "created_at",
      header: "Criada em",
      render: (row: PurchaseListItem) => (row.created_at ? formatData(row.created_at) : "—"),
    },
    { key: "supplier_name", header: "Fornecedor", render: (row: PurchaseListItem) => row.supplier_name },
    {
      key: "kind",
      header: "Tipo",
      render: (row: PurchaseListItem) => PURCHASE_KIND_LABELS[row.kind] ?? "—",
    },
    {
      key: "status",
      header: "Status",
      render: (row: PurchaseListItem) => <PurchaseStatusBadge status={row.status} />,
    },
    {
      key: "expected_date",
      header: "Previsão",
      render: (row: PurchaseListItem) => (row.expected_date ? formatData(row.expected_date) : "—"),
    },
    {
      key: "total_cost",
      header: "Custo total",
      render: (row: PurchaseListItem) => formatMoeda(row.total_cost),
    },
    {
      key: "payment_status",
      header: "Pagamento",
      render: (row: PurchaseListItem) => <SupplierPaymentBadge status={row.payment_status} />,
    },
    {
      key: "to_pay",
      header: "A pagar",
      render: (row: PurchaseListItem) => (
        <span className={row.to_pay > 0 ? "font-medium text-orange-600" : "text-muted-foreground"}>
          {formatMoeda(row.to_pay)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Compras</h1>
        <Button onClick={() => setReplenishmentOpen(true)}>
          <Plus className="h-4 w-4" />
          Compra para estoque
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList>
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="a-comprar">A comprar</TabsTrigger>
        </TabsList>

        <TabsContent value="compras" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select value={kind} onChange={(e) => setKind(pick(e.target.value, PURCHASE_KINDS))} className={selectClass}>
                <option value="">Todos</option>
                {PURCHASE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {PURCHASE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(pick(e.target.value, PURCHASE_STATUSES))}
                className={selectClass}
              >
                <option value="">Todos</option>
                {PURCHASE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PURCHASE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Pagamento</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(pick(e.target.value, SUPPLIER_PAYMENT_STATUSES))}
                className={selectClass}
              >
                <option value="">Todos</option>
                {SUPPLIER_PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {SUPPLIER_PAYMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Fornecedor</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={selectClass}>
                <option value="">Todos</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">De</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Até</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={purchases}
              isLoading={isLoading}
              emptyMessage="Nenhuma compra encontrada."
              onRowClick={(row) => router.push(`/compras/${row.id}`)}
            />
          </div>

          {!isLoading && purchases.length > 0 && (
            <div className="flex flex-wrap justify-end gap-6 text-sm">
              <span>
                Custo total: <strong>{formatMoeda(totals.cost)}</strong>
              </span>
              <span>
                A pagar: <strong className="text-orange-600">{formatMoeda(totals.toPay)}</strong>
              </span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="a-comprar" className="mt-4">
          <PendingSaleItemsQueue />
        </TabsContent>
      </Tabs>

      <ReplenishmentPurchaseModal
        open={replenishmentOpen}
        onClose={() => setReplenishmentOpen(false)}
        onCreated={() => mutate(isPurchaseRelatedKey)}
      />
    </div>
  );
}
