// Regras do Fechar venda (T05, C5): estado, payload `closing`, lucro previsto, avisos e erros — puras e testadas.
import { resolvePlan, toInstallmentsPayload, validatePlan, type PlanState } from "@/components/entity/installment-plan";
import { round2 } from "@/components/entity/items-grid";
import type { ClosingCostInput, ClosingItemInput, ClosingRequest, ItemKind, ItemOrigin, PaymentMethod, SaleCostKind } from "@/lib/types";

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

export interface ClosingCostDraft {
  key: string;
  kind: SaleCostKind;
  amount: number;
  payeeId: string;
  description: string;
}

export interface ClosingState {
  items: ClosingItemState[];
  deliveryDate: string;
  plan: PlanState;
  receivedNow: boolean;
  method: PaymentMethod | "";
  costs: ClosingCostDraft[];
}

export type ClosingSection = "items" | "delivery" | "receivable" | "costs";

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

export interface ClosingTotals {
  price: number;
  itemsCost: number;
  extraCosts: number;
  profit: number;
  margin: number | null;
}

/** Lucro previsto = preço − custos dos Items − custos previstos (T05). */
export function closingTotals(items: readonly ClosingItem[], chargesTotal: number, costs: readonly ClosingCostDraft[]): ClosingTotals {
  const itemsPrice = round2(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0));
  const price = round2(itemsPrice + chargesTotal);
  const itemsCost = round2(items.reduce((s, i) => s + i.quantity * i.unitCost, 0));
  const extraCosts = round2(costs.reduce((s, c) => s + (c.amount > 0 ? c.amount : 0), 0));
  const profit = round2(price - itemsCost - extraCosts);
  return { price, itemsCost, extraCosts, profit, margin: price > 0 ? round2((profit / price) * 100) : null };
}

/** Valor da entrada que o "Recebi agora" quita: a primeira parcela do plano. */
export function downPaymentOf(state: ClosingState, total: number, today: string): { amount: number } | null {
  const first = resolvePlan(state.plan, total, today)[0];
  return first ? { amount: first.amount } : null;
}

/** O corpo `closing` (C5): uma entrada por Item, na ordem, para o erro apontar o Item pelo índice. */
export function buildClosing(
  items: readonly ClosingItem[],
  state: ClosingState,
  total: number,
  today: string,
  defaults: ReadonlyMap<string, string>,
): ClosingRequest {
  const closingItems: ClosingItemInput[] = items.map((item, i) => {
    const s = state.items[i] ?? defaultItemState();
    const ref = item.ref.quoteItemId ? { quote_item_id: item.ref.quoteItemId } : { item_index: item.ref.index ?? i };
    if (item.kind === "SERVICE") return { ...ref, ...(s.laborPayeeId ? { labor_payee_id: s.laborPayeeId } : {}) };
    const supplier = effectiveSupplier(s, item, defaults);
    return {
      ...ref,
      origin: s.origin,
      ...(s.origin === "MADE_TO_ORDER" && supplier ? { supplier_id: supplier } : {}),
    };
  });

  const costs: ClosingCostInput[] = state.costs
    .filter((c) => c.amount > 0)
    .map((c) => ({
      kind: c.kind,
      amount: c.amount,
      payee_id: c.payeeId || null,
      description: c.description.trim() || null,
    }));

  const lines = resolvePlan(state.plan, total, today);
  const down = state.receivedNow && state.method ? downPaymentOf(state, total, today) : null;

  return {
    ...(state.deliveryDate ? { delivery_due_date: state.deliveryDate } : {}),
    items: closingItems,
    ...(costs.length ? { costs } : {}),
    ...(lines.length ? { receivable_plan: { installments: toInstallmentsPayload(lines) } } : {}),
    ...(down && state.method ? { down_payment: { amount: down.amount, occurred_on: today, payment_method: state.method } } : {}),
  };
}

/** Erros que dá para ver antes de enviar; `section` diz onde mostrar. */
export function validateClosing(
  state: ClosingState,
  total: number,
  today: string,
): { section: ClosingSection; message: string } | null {
  const lines = resolvePlan(state.plan, total, today);
  const planError = validatePlan(lines, total);
  if (planError) return { section: "receivable", message: planError };
  if (state.receivedNow && lines.length === 0) {
    return { section: "receivable", message: "Para registrar a entrada, defina o plano de recebimento." };
  }
  if (state.receivedNow && !state.method) {
    return { section: "receivable", message: "Escolha a forma de pagamento da entrada." };
  }
  if (state.costs.some((c) => c.amount < 0)) return { section: "costs", message: "O custo não pode ser negativo." };
  return null;
}

export interface ClosingErrorTarget {
  section: ClosingSection;
  /** Índice do Item ou do custo, quando o campo aponta um. */
  index?: number;
}

/** `closing.items[1].supplier_id` → seção e linha onde mostrar o erro (C5: erros trazem `field`). */
export function closingErrorTarget(field: string | undefined): ClosingErrorTarget | null {
  if (!field?.startsWith("closing")) return null;
  const idx = /\[(\d+)\]/.exec(field)?.[1];
  const index = idx === undefined ? undefined : Number(idx);
  if (field.startsWith("closing.items")) return { section: "items", index };
  if (field.startsWith("closing.costs")) return { section: "costs", index };
  if (field.startsWith("closing.delivery")) return { section: "delivery" };
  if (field.startsWith("closing.receivable_plan") || field.startsWith("closing.down_payment")) return { section: "receivable" };
  return null;
}

export const SECTION_LABELS: Record<ClosingSection, string> = {
  items: "Atendimento dos Items",
  delivery: "Entrega",
  receivable: "Recebimento",
  costs: "Custos previstos",
};
