import { round2 } from "@/components/entity/items-grid";
import type { ItemKind, ItemOrigin } from "@/lib/types";

export interface ClosingItem {
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
  supplierId: string | null;
  laborPayeeId: string;
  selected: boolean;
}

export const defaultItemState = (): ClosingItemState => ({
  origin: "MADE_TO_ORDER",
  supplierId: null,
  laborPayeeId: "",
  selected: false,
});

export function effectiveSupplier(
  state: ClosingItemState,
  item: ClosingItem,
  defaults: ReadonlyMap<string, string>,
): string {
  if (state.supplierId !== null) return state.supplierId;
  return (item.productId && defaults.get(item.productId)) || "";
}

export function stockShortfall(balance: number | undefined, quantity: number): number {
  if (balance === undefined) return 0;
  return Math.max(round2(quantity - balance), 0);
}
