"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuotes } from "@/hooks/useQuotes";
import { useClientes } from "@/hooks/useClientes";
import type { Quote, QuoteStatus } from "@/lib/types";
import {
  formatMoeda,
  formatData,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_COLORS,
} from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { summarizeQuotes } from "@/lib/customer-city";
import { useCityView } from "@/hooks/useCityView";
import { CityControls, CityGroupToggle, CustomerWithCity } from "@/components/tables/city-view";

const ALL_QUOTE_STATUSES: QuoteStatus[] = ["OPEN", "WON", "LOST"];
const quoteCustomerId = (q: Quote) => q.customer_id;
// Resumo do grupo por status, só os não-zero: "2 abertos · 3 ganhos".
const QUOTE_STATUS_COUNT_LABELS: Record<QuoteStatus, [string, string]> = {
  OPEN: ["aberto", "abertos"],
  WON: ["ganho", "ganhos"],
  LOST: ["perdido", "perdidos"],
};

export default function OrcamentosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<QuoteStatus | "">(
    (searchParams.get("status") as QuoteStatus) || "",
  );
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");
  const [clienteSearch, setClienteSearch] = useState("");
  const [debouncedClienteSearch, setDebouncedClienteSearch] = useState("");
  const [customerId, setCustomerId] = useState(searchParams.get("customer_id") || "");
  const [customerName, setCustomerName] = useState("");
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedClienteSearch(clienteSearch), 300);
    return () => clearTimeout(timer);
  }, [clienteSearch]);

  const { clientes } = useClientes(debouncedClienteSearch || undefined);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (status) f.status = status;
    if (from) f.from = from;
    if (to) f.to = to;
    if (customerId) f.customer_id = customerId;
    return Object.keys(f).length > 0 ? f : undefined;
  }, [status, from, to, customerId]);

  const { quotes: apiQuotes, isLoading: quotesLoading } = useQuotes(
    filters as Parameters<typeof useQuotes>[0],
  );

  // SPEC-012: cidade (do Customer) — filtro e agrupamento no cliente, persistidos na URL.
  const city = useCityView(apiQuotes, quoteCustomerId, {
    cidade: searchParams.get("cidade") || "",
    grouped: searchParams.get("agrupar") === "cidade",
  });
  const quotes = city.visible;
  const isLoading = quotesLoading || city.loading;

  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (customerId) params.set("customer_id", customerId);
    if (city.cidade) params.set("cidade", city.cidade);
    if (city.grouped) params.set("agrupar", "cidade");
    const qs = params.toString();
    router.replace(qs ? `/orcamentos?${qs}` : "/orcamentos", { scroll: false });
  }, [status, from, to, customerId, city.cidade, city.grouped, router]);

  function handleSelectCliente(id: string, nome: string) {
    setCustomerId(id);
    setCustomerName(nome);
    setClienteSearch("");
    setShowClienteDropdown(false);
  }

  function clearClienteFilter() {
    setCustomerId("");
    setCustomerName("");
    setClienteSearch("");
  }

  function produtoResumo(quote: Quote): string {
    if (!quote.items || quote.items.length === 0) return "—";
    const first = quote.items[0].product_name;
    if (quote.items.length === 1) return first;
    return `${first} e mais ${quote.items.length - 1}`;
  }

  const columns = [
    {
      key: "quote_date",
      header: "Data",
      render: (row: Quote) => formatData(row.quote_date),
    },
    {
      key: "customer_name",
      header: "Cliente",
      render: (row: Quote) => <CustomerWithCity name={row.customer_name} city={city.rowCity(row)} />,
    },
    {
      key: "produtos",
      header: "Produto(s)",
      render: (row: Quote) => (
        <span className="text-muted-foreground">{produtoResumo(row)}</span>
      ),
    },
    {
      key: "total_quote",
      header: "Total",
      render: (row: Quote) => formatMoeda(row.total_quote),
    },
    {
      key: "status",
      header: "Status",
      render: (row: Quote) => (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
              QUOTE_STATUS_COLORS[row.status],
            )}
          >
            {QUOTE_STATUS_LABELS[row.status]}
          </span>
          {row.quick_sale && (
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-muted-foreground whitespace-nowrap">
            Venda rápida
          </span>
          )}
        </span>
      ),
    },
  ];

  function renderRow(quote: Quote) {
    return (
      <tr
        key={quote.id}
        onClick={() => router.push(`/orcamentos/${quote.id}`)}
        className="border-b last:border-b-0 cursor-pointer transition-colors hover:bg-muted/40"
      >
        {columns.map((col) => (
          <td key={col.key} className="px-4 py-3">
            {col.render(quote)}
          </td>
        ))}
      </tr>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orçamentos</h1>
        <Button onClick={() => router.push("/orcamentos/novo")}>
          <Plus className="h-4 w-4" />
          Novo Orçamento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as QuoteStatus | "")}
            className="h-8 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos</option>
            {ALL_QUOTE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {QUOTE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">De</label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-8 w-36"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Até</label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 w-36"
          />
        </div>

        <div className="space-y-1 relative">
          <label className="text-xs font-medium text-muted-foreground">Cliente</label>
          {customerId ? (
            <div className="flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2 text-sm">
              <span>{customerName}</span>
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

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left font-medium text-muted-foreground"
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
            ) : quotes.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                  Nenhum orçamento encontrado.
                </td>
              </tr>
            ) : city.grouped ? (
              city.groups.map((g) => {
                const open = city.isOpen(g.key);
                const sum = summarizeQuotes(g.rows);
                return (
                  <Fragment key={g.key}>
                    <tr className="border-b bg-muted/30">
                      <td colSpan={3} className="px-2 py-2">
                        <CityGroupToggle
                          label={g.label}
                          count={g.rows.length}
                          noun={["orçamento", "orçamentos"]}
                          open={open}
                          onToggle={() => city.toggleGroup(g.key)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        {sum.byStatus.OPEN > 0 ? (
                          <>
                            <p className="font-medium">{formatMoeda(sum.openTotal)}</p>
                            <p className="text-xs text-muted-foreground">em aberto</p>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {ALL_QUOTE_STATUSES.filter((s) => sum.byStatus[s] > 0)
                          .map((s) => {
                            const n = sum.byStatus[s];
                            return `${n} ${QUOTE_STATUS_COUNT_LABELS[s][n === 1 ? 0 : 1]}`;
                          })
                          .join(" · ")}
                      </td>
                    </tr>
                    {open && g.rows.map((quote) => renderRow(quote))}
                  </Fragment>
                );
              })
            ) : (
              quotes.map((quote) => renderRow(quote))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
