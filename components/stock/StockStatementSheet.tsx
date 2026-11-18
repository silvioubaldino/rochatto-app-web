"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useStockStatement } from "@/hooks/useStock";
import {
  STOCK_MOVEMENT_KIND_LABELS,
  formatData,
  formatMoeda,
  formatQuantidade,
} from "@/lib/formatters";
import type { StockMovement } from "@/lib/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StockStatementSheetProps {
  productId: string | null;
  onClose: () => void;
  onNewAdjustment: (productId: string) => void;
}

function referenceLink(m: StockMovement) {
  if (!m.reference_id) return null;
  if (m.kind === "INFLOW") return `/compras/${m.reference_id}`;
  if (m.kind === "OUTFLOW") return `/vendas/${m.reference_id}`;
  return null;
}

/** Balance + extrato de um Product (GET /stock/balance/{productId}). */
export function StockStatementSheet({ productId, onClose, onNewAdjustment }: StockStatementSheetProps) {
  const { statement, isLoading, error } = useStockStatement(productId);

  return (
    <Sheet open={!!productId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{statement?.product_name ?? "Extrato do produto"}</SheetTitle>
          <SheetDescription>Entradas, saídas e ajustes que compõem o saldo.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          {isLoading || (!statement && !error) ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : error || !statement ? (
            <p className="text-sm text-destructive">Erro ao carregar o extrato.</p>
          ) : (
            <>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Entradas</dt>
                  <dd className="font-medium">{formatQuantidade(statement.inflow_qty)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Saídas</dt>
                  <dd className="font-medium">{formatQuantidade(statement.outflow_qty)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Ajustes</dt>
                  <dd className="font-medium">{formatQuantidade(statement.adjustment_qty)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Saldo</dt>
                  <dd className={cn("font-bold", statement.balance < 0 && "text-destructive")}>
                    {formatQuantidade(statement.balance)} {statement.unit ?? ""}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">
                Custo da última entrada:{" "}
                {statement.last_inflow_cost !== null
                  ? `${formatMoeda(statement.last_inflow_cost)}${statement.last_inflow_date ? ` em ${formatData(statement.last_inflow_date)}` : ""}`
                  : "—"}
              </p>

              <Button size="sm" variant="outline" onClick={() => onNewAdjustment(statement.product_id)}>
                <Plus className="h-3.5 w-3.5" />
                Novo ajuste
              </Button>

              {(statement.movements ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum movimento.</p>
              ) : (
                <div className="rounded-lg border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Data</th>
                        <th className="px-3 py-2 font-medium">Tipo</th>
                        <th className="px-3 py-2 font-medium">Descrição</th>
                        <th className="px-3 py-2 font-medium text-right">Qtd</th>
                        <th className="px-3 py-2 font-medium text-right">Custo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statement.movements.map((m, i) => {
                        const href = referenceLink(m);
                        return (
                          <tr key={`${m.kind}-${m.reference_id ?? i}-${i}`} className="border-b last:border-0">
                            <td className="px-3 py-2 whitespace-nowrap">{formatData(m.date)}</td>
                            <td className="px-3 py-2">{STOCK_MOVEMENT_KIND_LABELS[m.kind] ?? "—"}</td>
                            <td className="px-3 py-2">
                              {href ? (
                                <Link href={href} className="text-primary hover:underline">
                                  {m.description || "Ver"}
                                </Link>
                              ) : (
                                m.description || "—"
                              )}
                            </td>
                            <td
                              className={cn(
                                "px-3 py-2 text-right",
                                m.quantity < 0 && "text-destructive",
                              )}
                            >
                              {m.quantity > 0 ? "+" : ""}
                              {formatQuantidade(m.quantity)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {m.unit_cost !== null ? formatMoeda(m.unit_cost) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
