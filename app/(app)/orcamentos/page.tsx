"use client";

import { useState, useEffect, useMemo } from "react";
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

const ALL_QUOTE_STATUSES: QuoteStatus[] = ["OPEN", "WON", "LOST"];

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

  const { quotes, isLoading } = useQuotes(filters as Parameters<typeof useQuotes>[0]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (customerId) params.set("customer_id", customerId);
    const qs = params.toString();
    router.replace(qs ? `/orcamentos?${qs}` : "/orcamentos", { scroll: false });
  }, [status, from, to, customerId, router]);

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
      render: (row: Quote) => row.customer_name,
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
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
            QUOTE_STATUS_COLORS[row.status],
          )}
        >
          {QUOTE_STATUS_LABELS[row.status]}
        </span>
      ),
    },
  ];

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
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
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
            ) : (
              quotes.map((quote) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
