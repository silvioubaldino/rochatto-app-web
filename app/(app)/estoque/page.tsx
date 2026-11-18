"use client";

import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StockAdjustmentModal } from "@/components/stock/StockAdjustmentModal";
import { StockStatementSheet } from "@/components/stock/StockStatementSheet";
import { useStockAdjustments, useStockBalance } from "@/hooks/useStock";
import { useProdutos } from "@/hooks/useProdutos";
import {
  STOCK_ADJUSTMENT_REASON_LABELS,
  formatData,
  formatMoeda,
  formatQuantidade,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";

// Stock — AYD-002 §4: Balance por Product (calculado) + ajustes manuais imutáveis.
export default function EstoquePage() {
  const { mutate } = useSWRConfig();
  const { produtos } = useProdutos();

  // Saldo
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [onlyNegative, setOnlyNegative] = useState(false);
  const [statementProductId, setStatementProductId] = useState<string | null>(null);

  // Ajustes
  const [adjProductFilter, setAdjProductFilter] = useState("");
  const [adjModalOpen, setAdjModalOpen] = useState(false);
  const [adjModalProductId, setAdjModalProductId] = useState<string | undefined>();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { balances, isLoading: balancesLoading } = useStockBalance({
    q: debouncedSearch || undefined,
    only_negative: onlyNegative,
  });
  const { adjustments, isLoading: adjustmentsLoading } = useStockAdjustments(
    adjProductFilter || undefined,
  );

  const productName = (id: string) => produtos.find((p) => p.id === id)?.nome ?? "—";

  function openAdjustment(productId?: string) {
    setAdjModalProductId(productId);
    setAdjModalOpen(true);
  }

  function handleAdjustmentSaved() {
    // Saldo, extrato e lista de ajustes mudam juntos.
    mutate((key) => typeof key === "string" && key.startsWith("/stock"));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
        <Button onClick={() => openAdjustment()}>
          <Plus className="h-4 w-4" />
          Novo ajuste
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Saldo = entradas (compras de reposição recebidas) − saídas (itens de venda de estoque) ±
        ajustes. Itens sob encomenda não passam pelo estoque.
      </p>

      <Tabs defaultValue="saldo">
        <TabsList>
          <TabsTrigger value="saldo">Saldo por produto</TabsTrigger>
          <TabsTrigger value="ajustes">Ajustes</TabsTrigger>
        </TabsList>

        <TabsContent value="saldo" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Buscar produto</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nome do produto..."
                  className="h-8 w-56 pl-7"
                />
              </div>
            </div>
            <label className="flex h-8 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyNegative}
                onChange={(e) => setOnlyNegative(e.target.checked)}
                className="h-4 w-4"
              />
              Só saldo negativo
            </label>
          </div>

          {balancesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : balances.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {onlyNegative || debouncedSearch
                ? "Nenhum produto encontrado com esses filtros."
                : "Nenhum produto com movimento de estoque. Registre uma carga inicial com \"Novo ajuste\"."}
            </p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Produto</th>
                    <th className="px-4 py-3 text-left font-medium">Unidade</th>
                    <th className="px-4 py-3 text-right font-medium">Entradas</th>
                    <th className="px-4 py-3 text-right font-medium">Saídas</th>
                    <th className="px-4 py-3 text-right font-medium">Ajustes</th>
                    <th className="px-4 py-3 text-right font-medium">Saldo</th>
                    <th className="px-4 py-3 text-right font-medium">Custo última entrada</th>
                    <th className="px-4 py-3 text-right font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => (
                    <tr
                      key={b.product_id}
                      onClick={() => setStatementProductId(b.product_id)}
                      className={cn(
                        "border-b last:border-0 cursor-pointer hover:bg-muted/30",
                        b.balance < 0 && "bg-red-50",
                      )}
                      title="Ver extrato"
                    >
                      <td className="px-4 py-3 font-medium">{b.product_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{b.unit || "—"}</td>
                      <td className="px-4 py-3 text-right">{formatQuantidade(b.inflow_qty)}</td>
                      <td className="px-4 py-3 text-right">{formatQuantidade(b.outflow_qty)}</td>
                      <td className="px-4 py-3 text-right">{formatQuantidade(b.adjustment_qty)}</td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-semibold",
                          b.balance < 0 && "text-destructive",
                        )}
                      >
                        {formatQuantidade(b.balance)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {b.last_inflow_cost !== null ? formatMoeda(b.last_inflow_cost) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {b.last_inflow_date ? formatData(b.last_inflow_date) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ajustes" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Produto</Label>
              <select
                value={adjProductFilter}
                onChange={(e) => setAdjProductFilter(e.target.value)}
                className="h-8 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Todos</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {adjustmentsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : adjustments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum ajuste registrado.</p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Data</th>
                    <th className="px-4 py-3 text-left font-medium">Produto</th>
                    <th className="px-4 py-3 text-left font-medium">Motivo</th>
                    <th className="px-4 py-3 text-right font-medium">Quantidade</th>
                    <th className="px-4 py-3 text-right font-medium">Custo unit.</th>
                    <th className="px-4 py-3 text-left font-medium">Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="px-4 py-3 whitespace-nowrap">{formatData(a.adjusted_at)}</td>
                      <td className="px-4 py-3">{a.product_name || productName(a.product_id)}</td>
                      <td className="px-4 py-3">{STOCK_ADJUSTMENT_REASON_LABELS[a.reason] ?? "—"}</td>
                      <td
                        className={cn("px-4 py-3 text-right", a.quantity < 0 && "text-destructive")}
                      >
                        {a.quantity > 0 ? "+" : ""}
                        {formatQuantidade(a.quantity)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {a.unit_cost !== null ? formatMoeda(a.unit_cost) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[240px] truncate">
                        {a.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <StockStatementSheet
        productId={statementProductId}
        onClose={() => setStatementProductId(null)}
        onNewAdjustment={(id) => openAdjustment(id)}
      />

      <StockAdjustmentModal
        open={adjModalOpen}
        onClose={() => setAdjModalOpen(false)}
        productId={adjModalProductId}
        onSuccess={handleAdjustmentSaved}
      />
    </div>
  );
}
