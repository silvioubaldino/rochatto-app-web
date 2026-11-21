"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useVendas } from "@/hooks/useVendas";
import { useClientes } from "@/hooks/useClientes";
import Link from "next/link";
import type { Venda, SaleDeliveryStatus, SalePaymentStatus } from "@/lib/types";
import type { VendasFilters } from "@/hooks/useVendas";
import {
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
import { ChevronDown, ChevronRight, FileText, Layers, Search, X } from "lucide-react";
import {
  NO_CITY,
  buildCityIndex,
  cityLabel,
  cityOptions,
  groupByCity,
  saleCityKey,
} from "@/lib/sales-by-city";
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
  const [clienteSearch, setClienteSearch] = useState("");
  const [debouncedClienteSearch, setDebouncedClienteSearch] = useState("");
  const [clienteId, setClienteId] = useState(searchParams.get("cliente_id") || "");
  const [clienteNome, setClienteNome] = useState("");
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  // SPEC-012: cidade (do Customer) — filtro e agrupamento no cliente, persistidos na URL.
  const [cidade, setCidade] = useState(searchParams.get("cidade") || "");
  const [groupByCityOn, setGroupByCityOn] = useState(searchParams.get("agrupar") === "cidade");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  // Debounce client search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedClienteSearch(clienteSearch), 300);
    return () => clearTimeout(timer);
  }, [clienteSearch]);

  const { clientes } = useClientes(debouncedClienteSearch || undefined);

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

  // Todos os Customers (GET /clientes, sem paginação) → cidade por cliente_id.
  const { clientes: allClientes, isLoading: clientesLoading } = useClientes();
  const cityIndex = useMemo(() => buildCityIndex(allClientes), [allClientes]);
  const needsCities = groupByCityOn || cidade !== "";
  const isLoading = vendasLoading || (needsCities && clientesLoading);

  // Opções contam as Sales dos demais filtros (antes do filtro de cidade).
  const cidadeOptions = useMemo(
    () => cityOptions(apiVendas, cityIndex, cidade),
    [apiVendas, cityIndex, cidade],
  );
  const vendas = useMemo(
    () => (cidade ? apiVendas.filter((v) => saleCityKey(v, cityIndex) === cidade) : apiVendas),
    [apiVendas, cityIndex, cidade],
  );
  const groups = useMemo(
    () => (groupByCityOn ? groupByCity(vendas, cityIndex) : []),
    [groupByCityOn, vendas, cityIndex],
  );
  // Cidade embaixo do Cliente só quando não é redundante (sem agrupar e sem filtro de cidade).
  const showCityInRow = !groupByCityOn && !cidade;
  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g.key));

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAllGroups() {
    setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.key)));
  }

  // Update URL on filter change
  useEffect(() => {
    const params = new URLSearchParams();
    if (deliveryStatus) params.set("delivery_status", deliveryStatus);
    if (paymentStatus) params.set("payment_status", paymentStatus);
    if (dataInicio) params.set("from", dataInicio);
    if (dataFim) params.set("to", dataFim);
    if (clienteId) params.set("cliente_id", clienteId);
    if (cidade) params.set("cidade", cidade);
    if (groupByCityOn) params.set("agrupar", "cidade");
    const qs = params.toString();
    router.replace(qs ? `/vendas?${qs}` : "/vendas", { scroll: false });
  }, [deliveryStatus, paymentStatus, dataInicio, dataFim, clienteId, cidade, groupByCityOn, router]);

  function handleSelectCliente(id: string, nome: string) {
    setClienteId(id);
    setClienteNome(nome);
    setClienteSearch("");
    setShowClienteDropdown(false);
  }

  function clearClienteFilter() {
    setClienteId("");
    setClienteNome("");
    setClienteSearch("");
  }

  function produtoResumo(venda: Venda): string {
    if (!venda.itens || venda.itens.length === 0) return "—";
    const first = venda.itens[0].produto_nome;
    if (venda.itens.length === 1) return first;
    return `${first} e mais ${venda.itens.length - 1}`;
  }

  const columns = [
    {
      key: "data_venda",
      header: "Data",
      width: "100px",
      render: (row: Venda) => formatData(row.data_venda),
    },
    {
      key: "cliente_nome",
      header: "Cliente",
      render: (row: Venda) => {
        const key = saleCityKey(row, cityIndex);
        return (
          <div>
            <p>{row.cliente_nome}</p>
            {showCityInRow && key !== NO_CITY && (
              <p className="text-xs text-muted-foreground">{cityLabel(key, cityIndex)}</p>
            )}
          </div>
        );
      },
    },
    {
      key: "produtos",
      header: "Produto(s)",
      render: (row: Venda) => (
        <span className="text-muted-foreground">{produtoResumo(row)}</span>
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

        {/* Client search */}
        <div className="space-y-1 relative">
          <label className="text-xs font-medium text-muted-foreground">Cliente</label>
          {clienteId ? (
            <div className="flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2 text-sm">
              <span>{clienteNome}</span>
              <button
                onClick={clearClienteFilter}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  value={clienteSearch}
                  onChange={(e) => {
                    setClienteSearch(e.target.value);
                    setShowClienteDropdown(true);
                  }}
                  onFocus={() => clienteSearch && setShowClienteDropdown(true)}
                  onBlur={() => setTimeout(() => setShowClienteDropdown(false), 200)}
                  className="h-8 w-48 pl-7"
                />
              </div>
              {showClienteDropdown && clientes.length > 0 && (
                <div className="absolute top-full left-0 z-50 mt-1 w-48 rounded-md border bg-popover shadow-md">
                  {clientes.slice(0, 8).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onMouseDown={() => handleSelectCliente(c.id, c.nome)}
                    >
                      {c.nome}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* City filter (SPEC-012) */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Cidade</label>
          <select
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            className="h-8 max-w-48 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todas</option>
            {cidadeOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label} ({o.count})
              </option>
            ))}
          </select>
        </div>

        {/* Group by city (SPEC-012) */}
        <div className="flex items-end gap-2">
          <Button
            variant={groupByCityOn ? "secondary" : "outline"}
            size="sm"
            className="h-8"
            aria-pressed={groupByCityOn}
            onClick={() => setGroupByCityOn((v) => !v)}
          >
            <Layers className="h-4 w-4" />
            Agrupar por cidade
          </Button>
          {groupByCityOn && groups.length > 1 && (
            <Button variant="ghost" size="sm" className="h-8" onClick={toggleAllGroups}>
              {allCollapsed ? "Expandir tudo" : "Recolher tudo"}
            </Button>
          )}
        </div>
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
            ) : groupByCityOn ? (
              groups.map((g) => {
                const open = !collapsed.has(g.key);
                return (
                  <Fragment key={g.key}>
                    <tr className="border-b bg-muted/30">
                      <td colSpan={3} className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => toggleGroup(g.key)}
                          aria-expanded={open}
                          className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-muted"
                        >
                          {open ? (
                            <ChevronDown className="h-4 w-4 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          )}
                          <span className="font-semibold">{g.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {g.vendas.length} {g.vendas.length === 1 ? "venda" : "vendas"}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-2 font-medium">{formatMoeda(g.total)}</td>
                      <td className="px-4 py-2 font-medium">{formatMoeda(g.receivable)}</td>
                      <td
                        className={cn("px-4 py-2 font-medium", g.profit < 0 && "text-destructive")}
                      >
                        {formatMoeda(g.profit)}
                      </td>
                      <td colSpan={2} className="px-4 py-2 text-xs text-muted-foreground">
                        {g.toDeliver > 0 && `${g.toDeliver} a entregar`}
                      </td>
                    </tr>
                    {open && g.vendas.map((venda) => renderRow(venda))}
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
