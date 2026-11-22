"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useVendas } from "@/hooks/useVendas";
import Link from "next/link";
import type { Venda, SaleDeliveryStatus, SalePaymentStatus } from "@/lib/types";
import type { VendasFilters } from "@/hooks/useVendas";
import {
  saleItemsSummary,
  formatMoeda,
  formatData,
  SALE_DELIVERY_STATUSES,
  SALE_DELIVERY_STATUS_LABELS,
  SALE_PAYMENT_STATUSES,
  SALE_PAYMENT_STATUS_LABELS,
} from "@/lib/formatters";
import { SaleDeliveryBadge, SalePaymentBadge } from "@/components/status-badges";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import { summarizeSales } from "@/lib/customer-city";
import { useCityView } from "@/hooks/useCityView";
import { CityControls, CityGroupToggle, CustomerWithCity } from "@/components/tables/city-view";

const saleCustomerId = (v: Venda) => v.cliente_id;
import { cn } from "@/lib/utils";

const ROW_COLORS: Record<SaleDeliveryStatus, string> = {
  TO_DELIVER: "",
  DELIVERED: "bg-green-50/60",
  CANCELED: "bg-muted/40 text-muted-foreground",
};

function asDeliveryStatus(v: string | null): SaleDeliveryStatus | "" {
  return v && (SALE_DELIVERY_STATUSES as string[]).includes(v) ? (v as SaleDeliveryStatus) : "";
}

// "PENDING,PARTIAL" = em aberto (a receber), usado pelo card do dashboard
const PAYMENT_OPEN = "PENDING,PARTIAL";
type PaymentFilter = SalePaymentStatus | typeof PAYMENT_OPEN | "";

function asPaymentStatus(v: string | null): PaymentFilter {
  if (v === PAYMENT_OPEN) return PAYMENT_OPEN;
  return v && (SALE_PAYMENT_STATUSES as string[]).includes(v) ? (v as SalePaymentStatus) : "";
}

export default function VendasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters from URL
  const [deliveryStatus, setDeliveryStatus] = useState<SaleDeliveryStatus | "">(
    asDeliveryStatus(searchParams.get("delivery_status")),
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentFilter>(
    asPaymentStatus(searchParams.get("payment_status")),
  );
  // AYD-004: `from`/`to` (data_venda); `data_inicio`/`data_fim` legados ainda são aceitos na URL.
  const [dataInicio, setDataInicio] = useState(
    searchParams.get("from") || searchParams.get("data_inicio") || "",
  );
  const [dataFim, setDataFim] = useState(
    searchParams.get("to") || searchParams.get("data_fim") || "",
  );
  // AYD-004: filtros vindos do painel Financeiro (saldos em aberto)
  // F18: o filtro de cliente vindo da URL mostra o NOME (o combobox busca o registro pelo id).
  const [clienteId, setClienteId] = useState(searchParams.get("cliente_id") || "");

  // Build filters
  const filters = useMemo<VendasFilters | undefined>(() => {
    const f: VendasFilters = {};
    if (deliveryStatus) f.delivery_status = deliveryStatus;
    if (paymentStatus) f.payment_status = paymentStatus;
    if (dataInicio) f.from = dataInicio;
    if (dataFim) f.to = dataFim;
    if (clienteId) f.cliente_id = clienteId;
    return Object.keys(f).length > 0 ? f : undefined;
  }, [deliveryStatus, paymentStatus, dataInicio, dataFim, clienteId]);

  const { vendas: apiVendas, isLoading: vendasLoading } = useVendas(filters);

  // SPEC-012: cidade (do Customer) — filtro e agrupamento no cliente, persistidos na URL.
  const city = useCityView(apiVendas, saleCustomerId, {
    cidade: searchParams.get("cidade") || "",
    grouped: searchParams.get("agrupar") === "cidade",
  });
  const vendas = city.visible;
  const isLoading = vendasLoading || city.loading;

  // Update URL on filter change
  useEffect(() => {
    const params = new URLSearchParams();
    if (deliveryStatus) params.set("delivery_status", deliveryStatus);
    if (paymentStatus) params.set("payment_status", paymentStatus);
    if (dataInicio) params.set("from", dataInicio);
    if (dataFim) params.set("to", dataFim);
    if (clienteId) params.set("cliente_id", clienteId);
    if (city.cidade) params.set("cidade", city.cidade);
    if (city.grouped) params.set("agrupar", "cidade");
    const qs = params.toString();
    router.replace(qs ? `/vendas?${qs}` : "/vendas", { scroll: false });
  }, [deliveryStatus, paymentStatus, dataInicio, dataFim, clienteId, city.cidade, city.grouped, router]);

  // F04: a coluna "Items" usa `first_item_name`/`items_count` (C3); se a api ainda não os traz
  // (nem as linhas trazem Items), a coluna some em vez de mostrar "—" em todas as linhas.
  const showItems = apiVendas.some((v) => saleItemsSummary(v) !== null);

  const allColumns = [
    {
      key: "data_venda",
      header: "Data",
      width: "100px",
      render: (row: Venda) => formatData(row.data_venda),
    },
    {
      key: "cliente_nome",
      header: "Cliente",
      render: (row: Venda) => <CustomerWithCity name={row.cliente_nome} city={city.rowCity(row)} />,
    },
    {
      key: "produtos",
      header: "Items",
      render: (row: Venda) => (
        <span className="text-muted-foreground">{saleItemsSummary(row) ?? "—"}</span>
      ),
    },
    {
      key: "total_venda",
      header: "Total",
      render: (row: Venda) => formatMoeda(row.total_venda),
    },
    {
      key: "a_receber",
      header: "A Receber",
      render: (row: Venda) => formatMoeda(row.receivable),
    },
    {
      key: "lucro",
      header: "Lucro",
      render: (row: Venda) => (
        <span className={row.lucro < 0 ? "text-destructive" : ""}>
          {formatMoeda(row.lucro)}
        </span>
      ),
    },
    {
      key: "delivery_status",
      header: "Entrega",
      render: (row: Venda) => (
        <div className="space-y-0.5">
          <SaleDeliveryBadge status={row.delivery_status} />
          {row.delivery_status === "TO_DELIVER" && row.data_entrega_prevista && (
            <p className="text-xs text-muted-foreground">
              até {formatData(row.data_entrega_prevista)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "payment_status",
      header: "Pagamento",
      render: (row: Venda) => <SalePaymentBadge status={row.payment_status} />,
    },
  ];

  const columns = allColumns.filter((c) => c.key !== "produtos" || showItems);

  function renderRow(venda: Venda) {
    return (
      <tr
        key={venda.id}
        onClick={() => router.push(`/vendas/${venda.id}`)}
        className={cn(
          "border-b last:border-b-0 cursor-pointer transition-colors hover:opacity-80",
          ROW_COLORS[venda.delivery_status],
        )}
      >
        {columns.map((col) => (
          <td key={col.key} className="px-4 py-3">
            {col.render(venda)}
          </td>
        ))}
      </tr>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <Button variant="outline" onClick={() => router.push("/orcamentos/novo")}>
          <FileText className="h-4 w-4" />
          Novo Orçamento / Venda rápida
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Toda venda nasce de um orçamento: converta um orçamento ganho em{" "}
        <Link href="/orcamentos" className="text-primary hover:underline">
          Orçamentos
        </Link>{" "}
        ou use a <strong>Venda rápida</strong> no novo orçamento.
      </p>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Delivery status filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Entrega</label>
          <select
            value={deliveryStatus}
            onChange={(e) => setDeliveryStatus(asDeliveryStatus(e.target.value))}
            className="h-8 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todas</option>
            {SALE_DELIVERY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SALE_DELIVERY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Payment status filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Pagamento</label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(asPaymentStatus(e.target.value))}
            className="h-8 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos</option>
            <option value={PAYMENT_OPEN}>Em aberto (pendente + parcial)</option>
            {SALE_PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SALE_PAYMENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">De</label>
          <Input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="h-8 w-36"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Até</label>
          <Input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="h-8 w-36"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="filter-customer" className="text-xs font-medium text-muted-foreground">
            Cliente
          </label>
          <EntityCombobox
            kind="customer"
            id="filter-customer"
            value={clienteId}
            allowCreate={false}
            placeholder="Todos os clientes"
            className="md:w-56"
            onChange={(id) => setClienteId(id)}
          />
        </div>

        {/* City filter + grouping (SPEC-012) */}
        <CityControls
          cidade={city.cidade}
          onCidadeChange={city.setCidade}
          options={city.options}
          grouped={city.grouped}
          onGroupedChange={city.setGrouped}
          groupCount={city.groups.length}
          allCollapsed={city.allCollapsed}
          onToggleAll={city.toggleAll}
        />
      </div>

      {/* Table with row coloring */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left font-medium text-muted-foreground"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : vendas.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                  Nenhuma venda encontrada.
                </td>
              </tr>
            ) : city.grouped ? (
              city.groups.map((g) => {
                const open = city.isOpen(g.key);
                const sum = summarizeSales(g.rows);
                return (
                  <Fragment key={g.key}>
                    <tr className="border-b bg-muted/30">
                      <td colSpan={columns.length - 5} className="px-2 py-2">
                        <CityGroupToggle
                          label={g.label}
                          count={g.rows.length}
                          noun={["venda", "vendas"]}
                          open={open}
                          onToggle={() => city.toggleGroup(g.key)}
                        />
                      </td>
                      <td className="px-4 py-2 font-medium">{formatMoeda(sum.total)}</td>
                      <td className="px-4 py-2 font-medium">{formatMoeda(sum.receivable)}</td>
                      <td
                        className={cn("px-4 py-2 font-medium", sum.profit < 0 && "text-destructive")}
                      >
                        {formatMoeda(sum.profit)}
                      </td>
                      <td colSpan={2} className="px-4 py-2 text-xs text-muted-foreground">
                        {sum.toDeliver > 0 && `${sum.toDeliver} a entregar`}
                      </td>
                    </tr>
                    {open && g.rows.map((venda) => renderRow(venda))}
                  </Fragment>
                );
              })
            ) : (
              vendas.map((venda) => renderRow(venda))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
