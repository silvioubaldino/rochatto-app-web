// Atendimento dos Items (origem, fornecedor, saldo) — regras puras usadas pelo Fechar venda e pelo
// atendimento em lote da venda (T05/T06). Moram aqui, em `components/entity`, para as duas features
// compartilharem a seção sem uma importar a outra (AYD-011 §9.2).
import { round2 } from "@/components/entity/items-grid";
import type { ItemKind, ItemOrigin } from "@/lib/types";

/** Um Item a fechar, como o diálogo o recebe (do Quote aberto ou do editor da venda rápida). */
export interface ClosingItem {
  /** `quoteItemId` em /convert; `index` em /quick-sale. */
  ref: { quoteItemId?: string; index?: number };
  kind: ItemKind;
  productId: string | null;
  name: string;
  unit: string | null;
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

export interface ClosingItemState {
  origin: ItemOrigin;
  /** `null` = o dono não mexeu: vale o fornecedor habitual do produto (C8). */
  supplierId: string | null;
  /** Credor do custo de mão de obra (só serviço). */
  laborPayeeId: string;
  selected: boolean;
}

export const defaultItemState = (): ClosingItemState => ({
  origin: "MADE_TO_ORDER",
  supplierId: null,
  laborPayeeId: "",
  selected: false,
});

/** Fornecedor que vale para o Item: o escolhido, ou o habitual do produto. */
export function effectiveSupplier(
  state: ClosingItemState,
  item: ClosingItem,
  defaults: ReadonlyMap<string, string>,
): string {
  if (state.supplierId !== null) return state.supplierId;
  return (item.productId && defaults.get(item.productId)) || "";
}

/** Quanto falta do saldo para atender a quantidade (0 = tem saldo ou não se sabe). */
export function stockShortfall(balance: number | undefined, quantity: number): number {
  if (balance === undefined) return 0;
  return Math.max(round2(quantity - balance), 0);
}
