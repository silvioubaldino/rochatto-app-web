import { resolvePlan, toInstallmentsPayload, validatePlan, type PlanState } from "@/components/entity/installment-plan";
import { round2 } from "@/components/entity/items-grid";
import {
  defaultItemState,
  effectiveSupplier,
  stockShortfall,
  type ClosingItem,
  type ClosingItemState,
} from "@/components/entity/closing-items/closing-items-model";
import type { ClosingCostInput, ClosingItemInput, ClosingRequest, PaymentMethod, SaleCostKind } from "@/lib/types";

export { defaultItemState, effectiveSupplier, stockShortfall };
export type { ClosingItem, ClosingItemState };

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

export interface ClosingTotals {
  price: number;
  itemsCost: number;
  extraCosts: number;
  profit: number;
  margin: number | null;
}

export function closingTotals(items: readonly ClosingItem[], chargesTotal: number, costs: readonly ClosingCostDraft[]): ClosingTotals {
  const itemsPrice = round2(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0));
  const price = round2(itemsPrice + chargesTotal);
  const itemsCost = round2(items.reduce((s, i) => s + i.quantity * i.unitCost, 0));
  const extraCosts = round2(costs.reduce((s, c) => s + (c.amount > 0 ? c.amount : 0), 0));
  const profit = round2(price - itemsCost - extraCosts);
  return { price, itemsCost, extraCosts, profit, margin: price > 0 ? round2((profit / price) * 100) : null };
}

export function downPaymentOf(state: ClosingState, total: number, today: string): { amount: number } | null {
  const first = resolvePlan(state.plan, total, today)[0];
  return first ? { amount: first.amount } : null;
}

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
  index?: number;
}

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
