import { z } from "zod";
import { addDaysISO, formatCounterparty, formatMoney } from "@/lib/format";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/format/labels";
import { financePresetPeriod, validateFinancePeriod } from "@/lib/finance";
import {
  ALL_STATUSES,
  OPEN_STATUSES,
  PAGE_SIZE,
  defaultAllocations,
  hasMixedCounterparties,
  isSelectable,
  sameDirection,
  sumMoney,
  type MovementFilters,
  type ObligationFilters,
} from "@/lib/obligations";
import { signedMovementAmount } from "@/lib/schemas";
import type { FinancialMovement, MovementCategory, Obligation, ObligationDirection } from "@/lib/types";

export const OBLIGATION_CHIPS = [
  { value: "vencidas", label: "Vencidas" },
  { value: "7dias", label: "Próximos 7 dias" },
  { value: "abertas", label: "Em aberto" },
  { value: "todas", label: "Todas" },
] as const;
export type ObligationWhen = (typeof OBLIGATION_CHIPS)[number]["value"];

export const DEFAULT_WHEN: ObligationWhen = "abertas";
export const OBLIGATION_GROUPINGS = [
  { value: "", label: "Lista" },
  { value: "credor", label: "Por credor" },
] as const;

export interface ObligationUrlValues {
  quando: string;
  counterparty_type: string;
  counterparty_id: string;
  offset: string;
}

const WHEN_VALUES: readonly string[] = OBLIGATION_CHIPS.map((c) => c.value);
const PARTY_TYPES = ["SUPPLIER", "PARTNER", "CUSTOMER"] as const;

export function obligationFiltersFromUrl(direction: ObligationDirection, v: ObligationUrlValues, today: string): ObligationFilters {
  const when = (WHEN_VALUES.includes(v.quando) ? v.quando : DEFAULT_WHEN) as ObligationWhen;
  const party = v.counterparty_id && (PARTY_TYPES as readonly string[]).includes(v.counterparty_type);
  const offset = Number(v.offset);
  return {
    direction,
    status: when === "todas" ? ALL_STATUSES : OPEN_STATUSES,
    overdue: when === "vencidas",
    due_to: when === "7dias" ? addDaysISO(today, 7) : undefined,
    counterparty_type: party ? (v.counterparty_type as ObligationFilters["counterparty_type"]) : undefined,
    counterparty_id: party ? v.counterparty_id : undefined,
    offset: Number.isInteger(offset) && offset > 0 ? offset : 0,
  };
}

export const partyLabel = (direction: ObligationDirection): string => (direction === "RECEIVABLE" ? "Cliente" : "Credor");

export const obligationVerb = (direction: ObligationDirection): "Receber" | "Pagar" => (direction === "RECEIVABLE" ? "Receber" : "Pagar");

export const obligationTitle = (o: Pick<Obligation, "direction" | "counterparty">): string =>
  `${o.direction === "RECEIVABLE" ? "Conta a receber" : "Conta a pagar"} · ${formatCounterparty(o.counterparty)}`;

export const obligationDue = (o: Pick<Obligation, "next_installment" | "due_date">): string | null =>
  (o.next_installment?.due_date ?? o.due_date)?.slice(0, 10) ?? null;

export const counterpartyKey = (o: Pick<Obligation, "counterparty">): string => (o.counterparty ? `${o.counterparty.type}:${o.counterparty.id}` : "none");

export interface GroupSummary {
  open: number;
  count: number;
  overdue: number;
  payable: Obligation[];
}

export function groupSummary(rows: readonly Obligation[]): GroupSummary {
  return {
    open: sumMoney(rows.map((o) => o.open)),
    count: rows.length,
    overdue: rows.filter((o) => o.overdue && o.open > 0).length,
    payable: rows.filter(isSelectable),
  };
}

export const selectableIds = (rows: readonly Obligation[]): string[] => rows.filter(isSelectable).map((o) => o.id);

export const selectedObligations = (rows: readonly Obligation[], ids: ReadonlySet<string>): Obligation[] =>
  rows.filter((o) => ids.has(o.id) && isSelectable(o));

export function pageLabel(offset: number, total: number): string {
  if (total === 0) return "0 de 0";
  return `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} de ${total}`;
}

const METHODS = ["PIX", "CASH", "CARD", "BOLETO", "TRANSFER"] as const;

export const settleSchema = z.object({
  occurred_on: z.string().min(1, "Informe a data"),
  payment_method: z.string().pipe(z.enum(METHODS, { error: "Escolha a forma de pagamento" })),
  allocations: z
    .array(z.object({ obligation_id: z.string().min(1), amount: z.number({ error: "Informe o valor" }).gt(0, "Valor deve ser maior que zero") }))
    .min(1, "Selecione ao menos uma conta"),
});
export type SettleFormData = z.infer<typeof settleSchema>;
export type SettleFormValues = z.input<typeof settleSchema>;

export function settleDefaults(obligations: readonly Pick<Obligation, "id" | "open">[], today: string): SettleFormValues {
  return { occurred_on: today, payment_method: "", allocations: defaultAllocations([...obligations]) };
}

export const settleTotal = (allocations: readonly { amount: number }[]): number => sumMoney(allocations.map((a) => Number(a.amount) || 0));

export function toSettlePayload(d: SettleFormData) {
  return {
    movement: { occurred_on: d.occurred_on, payment_method: d.payment_method },
    allocations: d.allocations.map((a) => ({ obligation_id: a.obligation_id, amount: a.amount })),
  };
}

export function settleBlocker(obligations: readonly Obligation[]): string | null {
  if (obligations.length === 0) return "Não há contas em aberto para quitar.";
  if (!sameDirection([...obligations])) return "Escolha só contas a pagar ou só contas a receber.";
  return null;
}

export const settleMixedCounterparties = (obligations: readonly Obligation[]): boolean => obligations.length > 1 && hasMixedCounterparties([...obligations]);

export function settleTitle(obligations: readonly Obligation[]): string {
  const direction = obligations[0]?.direction ?? "PAYABLE";
  if (obligations.length === 1) return `${obligationVerb(direction)} — ${formatCounterparty(obligations[0].counterparty)}`;
  return `${obligationVerb(direction)} ${obligations.length} contas`;
}

export function settledMessage(direction: ObligationDirection, total: number, count: number): string {
  const what = direction === "RECEIVABLE" ? "Recebimento" : "Pagamento";
  return `${what} de ${formatMoney(total)} registrado${count > 1 ? ` (${count} contas)` : ""}.`;
}

export type MovementKind = "EXPENSE" | "INCOME";

export const MOVEMENT_DIRECTION_CHIPS = [
  { value: "", label: "Todas" },
  { value: "IN", label: "Entradas" },
  { value: "OUT", label: "Saídas" },
] as const;

export const MOVEMENT_ALLOCATION_CHIPS = [
  { value: "", label: "Todas" },
  { value: "sem", label: "Sem alocação" },
] as const;

export function movementCategories(kind: MovementKind, current?: MovementCategory): MovementCategory[] {
  const base = kind === "EXPENSE" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return current && !base.includes(current) ? [current, ...base] : [...base];
}

export const movementKindOf = (m: Pick<FinancialMovement, "amount">): MovementKind => (m.amount < 0 ? "EXPENSE" : "INCOME");

export const movementSchema = z.object({
  category: z.string().min(1, "Escolha a categoria"),
  amount: z.number({ error: "Informe o valor" }).gt(0, "Valor deve ser maior que zero"),
  occurred_on: z.string().min(1, "Informe a data"),
  payment_method: z.enum(["", ...METHODS]),
  counterparty_name: z.string(),
  description: z.string(),
});
export type MovementFormData = z.infer<typeof movementSchema>;

const nullIfEmpty = (v: string) => (v.trim() === "" ? null : v.trim());

export function toMovementPayload(d: MovementFormData) {
  const category = d.category as MovementCategory;
  return {
    occurred_on: d.occurred_on,
    amount: signedMovementAmount(category, d.amount),
    category,
    payment_method: d.payment_method === "" ? null : d.payment_method,
    counterparty_name: nullIfEmpty(d.counterparty_name),
    description: nullIfEmpty(d.description),
  };
}

export interface MovementUrlValues {
  from: string;
  to: string;
  category: string;
  direction: string;
  alocacao: string;
  unallocated_only?: string;
  offset: string;
}

export function movementFiltersFromUrl(v: MovementUrlValues, today: Date = new Date()): MovementFilters {
  const month = financePresetPeriod("this_month", today);
  const offset = Number(v.offset);
  return {
    from: v.from || month.from,
    to: v.to || month.to,
    category: v.category ? (v.category as MovementCategory) : undefined,
    direction: v.direction === "IN" || v.direction === "OUT" ? v.direction : undefined,
    unallocated_only: v.alocacao === "sem" || v.unallocated_only === "true",
    offset: Number.isInteger(offset) && offset > 0 ? offset : 0,
  };
}

export const movementPeriodError = (f: Pick<MovementFilters, "from" | "to">): string | null => validateFinancePeriod({ from: f.from, to: f.to });

export function resultLinks(period: { from: string; to: string }) {
  const range = `from=${period.from}&to=${period.to}`;
  return {
    sales: `/vendas?${range}`,
    movements: `/movimentacoes?${range}`,
    unallocated: `/movimentacoes?${range}&alocacao=sem`,
    outflows: `/movimentacoes?${range}&direction=OUT`,
    receivable: "/contas/receber",
    payable: "/contas/pagar",
  };
}
