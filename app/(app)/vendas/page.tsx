"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useVendas } from "@/hooks/useVendas";
import { useClientes } from "@/hooks/useClientes";
import type { Venda, StatusVenda } from "@/lib/types";
import { formatMoeda, formatData, STATUS_LABELS, STATUS_COLORS } from "@/lib/formatters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ALL_STATUSES: StatusVenda[] = [
  "A_ENTREGAR",
  "A_ENTREGAR_DATA",
  "A_RETIRAR",
  "ENTREGUE_PARCIAL",
  "ENTREGUE",
];

export default function VendasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters from URL
  const [status, setStatus] = useState<StatusVenda | "">(
    (searchParams.get("status") as StatusVenda) || "",
  );
  const [dataInicio, setDataInicio] = useState(searchParams.get("data_inicio") || "");
  const [dataFim, setDataFim] = useState(searchParams.get("data_fim") || "");
  const [clienteSearch, setClienteSearch] = useState("");
  const [debouncedClienteSearch, setDebouncedClienteSearch] = useState("");
  const [clienteId, setClienteId] = useState(searchParams.get("cliente_id") || "");
  const [clienteNome, setClienteNome] = useState("");
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);

  // Debounce client search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedClienteSearch(clienteSearch), 300);
    return () => clearTimeout(timer);
  }, [clienteSearch]);

  const { clientes } = useClientes(debouncedClienteSearch || undefined);

  // Build filters
  const filters = useMemo(() => {
    const f: Record<string, string | boolean> = {};
    if (status) f.status = status;
    if (dataInicio) f.data_inicio = dataInicio;
    if (dataFim) f.data_fim = dataFim;
    if (clienteId) f.cliente_id = clienteId;
    return Object.keys(f).length > 0 ? f : undefined;
  }, [status, dataInicio, dataFim, clienteId]);

  const { vendas, isLoading } = useVendas(filters as Parameters<typeof useVendas>[0]);

  // Update URL on filter change
  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (dataInicio) params.set("data_inicio", dataInicio);
    if (dataFim) params.set("data_fim", dataFim);
    if (clienteId) params.set("cliente_id", clienteId);
    const qs = params.toString();
    router.replace(qs ? `/vendas?${qs}` : "/vendas", { scroll: false });
  }, [status, dataInicio, dataFim, clienteId, router]);

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
      render: (row: Venda) => row.cliente_nome,
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
      render: (row: Venda) => formatMoeda(row.a_receber),
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
      key: "status",
      header: "Status",
      width: "180px",
      render: (row: Venda) => (
        <StatusBadge status={row.status} dataEntrega={row.data_entrega_prevista} />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <Button onClick={() => router.push("/vendas/nova")}>
          <Plus className="h-4 w-4" />
          Nova Venda
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Status filter */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusVenda | "")}
            className="h-8 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
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
      </div>

      {/* Table with row coloring */}
      <div className="rounded-lg border overflow-hidden">
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
            ) : (
              vendas.map((venda) => (
                <tr
                  key={venda.id}
                  onClick={() => router.push(`/vendas/${venda.id}`)}
                  className={cn(
                    "border-b last:border-b-0 cursor-pointer transition-colors hover:opacity-80",
                    STATUS_COLORS[venda.status].split(" ")[0],
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.render(venda)}
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
