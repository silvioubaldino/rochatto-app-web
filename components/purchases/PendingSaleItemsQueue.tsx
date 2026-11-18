"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { AlertTriangle, Loader2, PackagePlus, ShoppingBag } from "lucide-react";
import { api, APIError } from "@/lib/api";
import { isPurchaseRelatedKey, usePendingSaleItems, usePurchases } from "@/hooks/usePurchases";
import { formatData, formatMoeda, formatQuantidade } from "@/lib/formatters";
import type { PendingSaleItemGroup, PurchaseDetail, PurchaseListItem } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fila "a comprar" (RF-31): Items MADE_TO_ORDER sem Purchase, de Sales não canceladas,
 * agrupados por Supplier. O dono marca os Items e gera uma Purchase nova ou os anexa a uma
 * Purchase OPEN do mesmo Supplier.
 */
export function PendingSaleItemsQueue() {
  const { groups, isLoading, error } = usePendingSaleItems();
  const { purchases: openPurchases } = usePurchases({ kind: "MADE_TO_ORDER", status: "OPEN" });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }
  if (error) {
    return <p className="py-8 text-center text-sm text-destructive">Erro ao carregar a fila de compras.</p>;
  }

  const nonEmpty = groups.filter((g) => g.items.length > 0);
  if (nonEmpty.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Nada a comprar: todos os itens sob encomenda já estão em compras.
      </p>
    );
  }

  // Grupo sem Supplier por último.
  const sorted = [...nonEmpty].sort((a, b) => {
    if (!a.supplier_id) return 1;
    if (!b.supplier_id) return -1;
    return (a.supplier_name ?? "").localeCompare(b.supplier_name ?? "", "pt-BR");
  });

  return (
    <div className="space-y-4">
      {sorted.map((group) =>
        group.supplier_id ? (
          <SupplierGroup
            key={group.supplier_id}
            group={group}
            supplierId={group.supplier_id}
            openPurchases={openPurchases.filter((p) => p.supplier_id === group.supplier_id)}
          />
        ) : (
          <NoSupplierGroup key="no-supplier" group={group} />
        ),
      )}
    </div>
  );
}

function ItemsTable({
  group,
  selected,
  onToggle,
  onToggleAll,
}: {
  group: PendingSaleItemGroup;
  selected?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: () => void;
}) {
  const selectable = !!selected;
  const allSelected = selectable && group.items.every((i) => selected.has(i.id));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            {selectable && (
              <th className="w-8 pb-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  aria-label="Selecionar todos"
                  className="h-4 w-4"
                />
              </th>
            )}
            <th className="pb-2 pr-3 font-medium">Venda</th>
            <th className="pb-2 pr-3 font-medium">Cliente</th>
            <th className="pb-2 pr-3 font-medium">Produto</th>
            <th className="pb-2 pr-3 font-medium text-right">Qtd</th>
            <th className="pb-2 pr-3 font-medium text-right">Custo unit.</th>
            <th className="pb-2 font-medium text-right">Custo total</th>
          </tr>
        </thead>
        <tbody>
          {group.items.map((item) => (
            <tr key={item.id} className="border-b last:border-0">
              {selectable && (
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => onToggle?.(item.id)}
                    aria-label={`Selecionar ${item.produto_nome}`}
                    className="h-4 w-4"
                  />
                </td>
              )}
              <td className="py-2 pr-3 whitespace-nowrap">
                <Link href={`/vendas/${item.sale_id}`} className="text-primary hover:underline">
                  {item.sale_date ? formatData(item.sale_date) : `#${item.sale_id.slice(0, 8)}`}
                </Link>
              </td>
              <td className="py-2 pr-3">{item.customer_name}</td>
              <td className="py-2 pr-3">{item.produto_nome}</td>
              <td className="py-2 pr-3 text-right">{formatQuantidade(item.quantidade)}</td>
              <td className="py-2 pr-3 text-right">{formatMoeda(item.custo_unit)}</td>
              <td className="py-2 text-right">{formatMoeda(item.quantidade * item.custo_unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SupplierGroup({
  group,
  supplierId,
  openPurchases,
}: {
  group: PendingSaleItemGroup;
  supplierId: string;
  openPurchases: PurchaseListItem[];
}) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetPurchaseId, setTargetPurchaseId] = useState("");
  const [busy, setBusy] = useState<"create" | "attach" | null>(null);

  const selectedIds = group.items.filter((i) => selected.has(i.id)).map((i) => i.id);
  const selectedCost = group.items
    .filter((i) => selected.has(i.id))
    .reduce((s, i) => s + i.quantidade * i.custo_unit, 0);
  const attachTarget = targetPurchaseId || openPurchases[0]?.id || "";

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      group.items.every((i) => prev.has(i.id)) ? new Set() : new Set(group.items.map((i) => i.id)),
    );
  }

  async function createPurchase() {
    setBusy("create");
    try {
      const created = await api.post<PurchaseDetail>("/purchases", {
        kind: "MADE_TO_ORDER",
        supplier_id: supplierId,
        expected_date: null,
        notes: null,
        sale_item_ids: selectedIds,
        items: [],
      });
      toast.success("Compra criada.");
      setSelected(new Set());
      await mutate(isPurchaseRelatedKey);
      if (created?.id) router.push(`/compras/${created.id}`);
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao criar compra.");
    } finally {
      setBusy(null);
    }
  }

  async function attach() {
    if (!attachTarget) return;
    setBusy("attach");
    try {
      await api.post(`/purchases/${attachTarget}/sale-items`, { sale_item_ids: selectedIds });
      toast.success("Itens adicionados à compra.");
      setSelected(new Set());
      await mutate(isPurchaseRelatedKey);
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao adicionar itens à compra.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">
          {group.supplier_name ?? "Fornecedor"}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            · {group.items.length} {group.items.length === 1 ? "item" : "itens"}
          </span>
        </h3>
        {selectedIds.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} selecionado(s) · {formatMoeda(selectedCost)}
          </span>
        )}
      </div>

      <ItemsTable group={group} selected={selected} onToggle={toggle} onToggleAll={toggleAll} />

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <Button size="sm" onClick={createPurchase} disabled={selectedIds.length === 0 || busy !== null}>
          {busy === "create" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingBag className="h-3.5 w-3.5" />}
          Gerar compra
        </Button>
        {openPurchases.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground">ou adicionar à compra aberta</span>
            <select
              value={attachTarget}
              onChange={(e) => setTargetPurchaseId(e.target.value)}
              className="h-7 rounded-md border border-input bg-background px-2 text-sm"
            >
              {openPurchases.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id.slice(0, 8)} · {formatMoeda(p.total_cost)}
                  {p.expected_date ? ` · prev. ${formatData(p.expected_date)}` : ""}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={attach}
              disabled={selectedIds.length === 0 || busy !== null}
            >
              {busy === "attach" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PackagePlus className="h-3.5 w-3.5" />}
              Adicionar
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

function NoSupplierGroup({ group }: { group: PendingSaleItemGroup }) {
  return (
    <Card className="p-4 space-y-3 border-amber-300">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <h3 className="font-semibold">Sem fornecedor definido</h3>
          <p className="text-sm text-muted-foreground">
            Defina o fornecedor de cada item na venda para incluí-lo numa compra.
          </p>
        </div>
      </div>
      <ItemsTable group={group} />
    </Card>
  );
}
