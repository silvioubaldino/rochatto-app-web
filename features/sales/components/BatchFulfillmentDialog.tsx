"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEntityOptions } from "@/components/entity/entity-queries";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { ClosingItemsSection } from "@/features/closing/components/ClosingItemsSection";
import { defaultItemState, effectiveSupplier, type ClosingItem, type ClosingItemState } from "@/features/closing/model";
import { isApiError } from "@/lib/errors";
import type { BatchFulfillmentItem, ItemVenda } from "@/lib/types";
import { useBatchFulfillment } from "../mutations";

/** Atendimento em lote (C6): origem e fornecedor dos Items da venda de uma vez, tudo ou nada. */
export function BatchFulfillmentDialog({
  open,
  onOpenChange,
  saleId,
  items,
  balances,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  /** Items de produto livres (fora de compra). */
  items: ItemVenda[];
  balances: ReadonlyMap<string, number>;
}) {
  return open ? <Form onOpenChange={onOpenChange} saleId={saleId} items={items} balances={balances} /> : null;
}

function Form({ onOpenChange, saleId, items, balances }: Omit<Parameters<typeof BatchFulfillmentDialog>[0], "open">) {
  const batch = useBatchFulfillment(saleId);
  const products = useEntityOptions("product", "", true).options;
  const defaults = new Map<string, string>();
  for (const o of products) if (o.raw.default_supplier_id) defaults.set(o.id, o.raw.default_supplier_id);

  const closingItems: ClosingItem[] = items.map((i, index) => ({
    ref: { index },
    kind: "PRODUCT",
    productId: i.produto_id ?? null,
    name: i.produto_nome,
    unit: null,
    quantity: i.quantidade,
    unitPrice: i.preco_venda_unit,
    unitCost: i.custo_unit,
  }));
  const [states, setStates] = useState<ClosingItemState[]>(() =>
    items.map((i) => ({ ...defaultItemState(), origin: i.origin ?? "MADE_TO_ORDER", supplierId: i.fornecedor_id ?? null })),
  );

  async function save() {
    const payload: BatchFulfillmentItem[] = items.map((i, idx) => {
      const s = states[idx];
      const supplier = effectiveSupplier(s, closingItems[idx], defaults);
      return { id: i.id, origin: s.origin, fornecedor_id: s.origin === "MADE_TO_ORDER" && supplier ? supplier : null };
    });
    const res = await batch.mutate(payload);
    if (res) {
      if (res.warnings?.length) {
        // aviso de saldo: a venda segue permitida (RN-16)
        toast.warning("Estoque insuficiente em parte dos items: o saldo fica negativo.");
      }
      onOpenChange(false);
    }
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={onOpenChange}
      title="Definir atendimento"
      description="Origem e fornecedor de cada item. Tudo ou nada."
      size="lg"
      dismissible={!batch.pending}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={batch.pending}>Voltar</Button>
          <Button type="button" onClick={save} disabled={batch.pending || items.length === 0}>
            {batch.pending && <Loader2 className="animate-spin" aria-hidden />}
            Salvar atendimento
          </Button>
        </>
      }
    >
      {isApiError(batch.error) && (
        <p role="alert" className="mb-3 rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">{batch.error.message}</p>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todos os items já estão em compra.</p>
      ) : (
        <ClosingItemsSection
          items={closingItems}
          states={states}
          defaults={defaults}
          balances={balances}
          onChange={(i, patch) => setStates((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)))}
        />
      )}
    </ResponsiveDialog>
  );
}
