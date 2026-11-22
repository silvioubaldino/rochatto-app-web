"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import { Select } from "@/components/patterns/Select";
import { QuantityText } from "@/components/patterns/values";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { ITEM_ORIGIN_LABELS, formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ItemOrigin } from "@/lib/types";
import { effectiveSupplier, stockShortfall, type ClosingItem, type ClosingItemState } from "./closing-items-model";

const ORIGINS: ItemOrigin[] = ["MADE_TO_ORDER", "FROM_STOCK"];

export function ClosingItemsSection({
  items,
  states,
  defaults,
  balances,
  errorIndex,
  onChange,
}: {
  items: readonly ClosingItem[];
  states: readonly ClosingItemState[];
  defaults: ReadonlyMap<string, string>;
  balances: ReadonlyMap<string, number>;
  errorIndex?: number;
  onChange: (index: number, patch: Partial<ClosingItemState>) => void;
}) {
  const [bulkOrigin, setBulkOrigin] = useState<ItemOrigin>("MADE_TO_ORDER");
  const [bulkSupplier, setBulkSupplier] = useState("");
  const selectedProducts = items.map((it, i) => ({ it, i })).filter(({ it, i }) => it.kind === "PRODUCT" && states[i]?.selected);

  function applyBulk() {
    for (const { i } of selectedProducts) {
      onChange(i, { origin: bulkOrigin, supplierId: bulkOrigin === "MADE_TO_ORDER" ? bulkSupplier : "", selected: false });
    }
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {items.map((item, i) => {
          const s = states[i];
          const service = item.kind === "SERVICE";
          const balance = item.productId ? balances.get(item.productId) : undefined;
          const short = s.origin === "FROM_STOCK" ? stockShortfall(balance, item.quantity) : 0;
          return (
            <li
              key={`${item.ref.quoteItemId ?? item.ref.index}`}
              className={cn("space-y-2 rounded-lg border p-3", errorIndex === i && "border-danger")}
            >
              <div className="flex items-start gap-2">
                {!service && (
                  <input
                    type="checkbox"
                    className="mt-1 size-5 md:size-4"
                    checked={s.selected}
                    onChange={(e) => onChange(i, { selected: e.target.checked })}
                    aria-label={`Selecionar ${item.name}`}
                  />
                )}
                <p className="min-w-0 flex-1 font-medium">
                  {item.name} <span className="font-normal text-muted-foreground"><QuantityText value={item.quantity} unit={item.unit} /></span>
                  {service && <StatusBadge kind="itemKind" value="SERVICE" className="ml-2" />}
                </p>
              </div>

              {service ? (
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground" htmlFor={`labor-${i}`}>Instalador / prestador (custo previsto {formatQuantity(item.quantity * item.unitCost)})</label>
                  <EntityCombobox
                    kind="supplier"
                    id={`labor-${i}`}
                    value={s.laborPayeeId}
                    placeholder="A definir"
                    prefer={(f) => f.kind === "LABOR"}
                    onChange={(id) => onChange(i, { laborPayeeId: id })}
                  />
                </div>
              ) : (
                <>
                  <div role="radiogroup" aria-label={`Origem de ${item.name}`} className="flex flex-wrap gap-2">
                    {ORIGINS.map((o) => (
                      <button
                        key={o}
                        type="button"
                        role="radio"
                        aria-checked={s.origin === o}
                        disabled={o === "FROM_STOCK" && !item.productId}
                        onClick={() => onChange(i, { origin: o })}
                        className={cn(
                          "inline-flex min-h-11 items-center rounded-full border px-4 text-base disabled:opacity-50 md:min-h-8 md:px-3 md:text-sm",
                          s.origin === o ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
                        )}
                      >
                        {ITEM_ORIGIN_LABELS[o]}
                      </button>
                    ))}
                  </div>
                  {s.origin === "MADE_TO_ORDER" ? (
                    <EntityCombobox
                      kind="supplier"
                      aria-label={`Fornecedor de ${item.name}`}
                      value={effectiveSupplier(s, item, defaults)}
                      placeholder="Fornecedor (definir depois)"
                      prefer={(f) => f.kind === "STONE"}
                      onChange={(id) => onChange(i, { supplierId: id })}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {balance === undefined ? "Sai do estoque." : <>Sai do estoque · saldo <QuantityText value={balance} unit={item.unit} /></>}
                    </p>
                  )}
                  {short > 0 && (
                    <p role="status" className="flex items-center gap-1.5 text-sm text-warning">
                      <AlertTriangle className="size-4 shrink-0" aria-hidden />
                      Faltam <QuantityText value={short} unit={item.unit} /> no estoque — a venda é permitida e o saldo fica negativo.
                    </p>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>

      {selectedProducts.length > 0 && (
        <div className="space-y-2 rounded-lg bg-muted/40 p-3">
          <p className="text-sm font-medium">Aplicar aos {selectedProducts.length} selecionados</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_1fr_auto]">
            <Select
              aria-label="Origem dos selecionados"
              value={bulkOrigin}
              onChange={(v) => setBulkOrigin(v as ItemOrigin)}
              options={ORIGINS.map((o) => ({ value: o, label: ITEM_ORIGIN_LABELS[o] }))}
            />
            {bulkOrigin === "MADE_TO_ORDER" ? (
              <EntityCombobox kind="supplier" aria-label="Fornecedor dos selecionados" value={bulkSupplier} placeholder="Fornecedor" prefer={(f) => f.kind === "STONE"} onChange={(id) => setBulkSupplier(id)} />
            ) : (
              <span />
            )}
            <Button type="button" variant="outline" onClick={applyBulk}>Aplicar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
