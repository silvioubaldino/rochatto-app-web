import { parseFinancePeriod } from "./finance";
import type {
  CounterpartyType,
  MovementCategory,
  Obligation,
  ObligationDirection,
  ObligationStatus,
} from "./types";

// Filtros, seleção e conferências puras das telas de contas e movimentações (AYD-007).
// Valor, quitado, em aberto e status vêm calculados da API; aqui só há conveniências de
// formulário e de URL.

export const PAGE_SIZE = 50;

type ParamReader = { get(name: string): string | null };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// --- Contas -----------------------------------------------------------------

export const OPEN_STATUSES = "OPEN,PARTIAL";
export const ALL_STATUSES = "ALL";

export interface ObligationFilters {
  direction: ObligationDirection;
  /** "OPEN,PARTIAL" (padrão), um status ou "ALL" (sem filtro). */
  status: string;
  counterparty_type?: CounterpartyType;
  counterparty_id?: string;
  overdue: boolean;
  due_to?: string;
  offset: number;
}

export function parseDirection(v: string | null | undefined): ObligationDirection {
  return v === "RECEIVABLE" ? "RECEIVABLE" : "PAYABLE";
}

const STATUS_VALUES: ObligationStatus[] = ["OPEN", "PARTIAL", "SETTLED"];

function parseStatus(v: string | null): string {
  if (v === ALL_STATUSES) return ALL_STATUSES;
  if (!v) return OPEN_STATUSES;
  const parts = v.split(",");
  return parts.every((p) => (STATUS_VALUES as string[]).includes(p)) ? v : OPEN_STATUSES;
}

const COUNTERPARTY_TYPES: CounterpartyType[] = ["SUPPLIER", "PARTNER", "CUSTOMER"];

/** Lê os filtros da URL da lista de contas; valores inválidos caem no padrão. */
export function parseObligationFilters(params: ParamReader): ObligationFilters {
  const type = params.get("counterparty_type");
  const id = params.get("counterparty_id");
  const dueTo = params.get("due_to");
  const offset = Number(params.get("offset"));
  const validCounterparty = !!id && (COUNTERPARTY_TYPES as string[]).includes(type ?? "");
  return {
    direction: parseDirection(params.get("direction")),
    status: parseStatus(params.get("status")),
    counterparty_type: validCounterparty ? (type as CounterpartyType) : undefined,
    counterparty_id: validCounterparty ? (id as string) : undefined,
    overdue: params.get("overdue") === "true",
    due_to: dueTo && ISO_DATE.test(dueTo) ? dueTo : undefined,
    offset: Number.isInteger(offset) && offset > 0 ? offset : 0,
  };
}

/** Parâmetros de `GET /obligations` (e da URL da tela — a mesma serialização). */
export function obligationFiltersToParams(f: ObligationFilters, withPaging = true): URLSearchParams {
  const p = new URLSearchParams();
  p.set("direction", f.direction);
  if (f.status !== ALL_STATUSES) p.set("status", f.status);
  else p.set("status", ALL_STATUSES);
  if (f.counterparty_type && f.counterparty_id) {
    p.set("counterparty_type", f.counterparty_type);
    p.set("counterparty_id", f.counterparty_id);
  }
  if (f.overdue) p.set("overdue", "true");
  if (f.due_to) p.set("due_to", f.due_to);
  if (withPaging) {
    if (f.offset > 0) p.set("offset", String(f.offset));
  }
  return p;
}

/** Query string da chamada à API: "ALL" vira ausência de `status`; inclui limit/offset. */
export function obligationApiQuery(f: ObligationFilters): string {
  const p = obligationFiltersToParams(f);
  if (f.status === ALL_STATUSES) p.delete("status");
  p.set("limit", String(PAGE_SIZE));
  return p.toString();
}

/** Contas com saldo em aberto podem ser selecionadas para pagar/receber. */
export function isSelectable(o: Pick<Obligation, "open">): boolean {
  return o.open > 0;
}

/** Contas só entram na mesma movimentação se forem da mesma direção (a API devolve 400). */
export function sameDirection(list: Pick<Obligation, "direction">[]): boolean {
  return list.every((o) => o.direction === list[0]?.direction);
}

/** Verdadeiro se as contas têm credores diferentes (inclui "a definir" × credor). */
export function hasMixedCounterparties(list: Pick<Obligation, "counterparty">[]): boolean {
  const keys = new Set(list.map((o) => (o.counterparty ? `${o.counterparty.type}:${o.counterparty.id}` : "none")));
  return keys.size > 1;
}

/** Alocação inicial de cada conta = o que está em aberto. */
export function defaultAllocations(list: Pick<Obligation, "id" | "open">[]) {
  return list.map((o) => ({ obligation_id: o.id, amount: o.open }));
}

const cents = (n: number) => Math.round(n * 100);

/** Soma em centavos (evita erro de ponto flutuante). */
export function sumMoney(values: number[]): number {
  return values.reduce((s, v) => s + cents(v), 0) / 100;
}

/** Σ parcelas não pode passar do valor da conta (a API devolve 400); retorna a mensagem ou null. */
export function validateInstallmentsTotal(amounts: number[], obligationAmount: number): string | null {
  const total = amounts.reduce((s, v) => s + cents(v), 0);
  return total > cents(obligationAmount) ? "A soma das parcelas passa do valor da conta." : null;
}

// --- Movimentações ----------------------------------------------------------

export interface MovementFilters {
  from: string;
  to: string;
  category?: MovementCategory;
  direction?: "IN" | "OUT";
  unallocated_only: boolean;
  offset: number;
}

const CATEGORY_VALUES: MovementCategory[] = [
  "SALE_RECEIPT",
  "OTHER_INCOME",
  "PURCHASE_PAYMENT",
  "FREIGHT",
  "LABOR",
  "COMMISSION",
  "VEHICLE",
  "TAXES",
  "FIXED_COSTS",
  "MARKETING",
  "BANK_FEES",
  "OTHER_EXPENSE",
];

/** Lê os filtros da URL de /movimentacoes; período padrão = mês corrente. */
export function parseMovementFilters(params: ParamReader, today: Date = new Date()): MovementFilters {
  const period = parseFinancePeriod(params.get("from"), params.get("to"), today);
  const category = params.get("category");
  const direction = params.get("direction");
  const offset = Number(params.get("offset"));
  return {
    from: period.from,
    to: period.to,
    category: (CATEGORY_VALUES as string[]).includes(category ?? "") ? (category as MovementCategory) : undefined,
    direction: direction === "IN" || direction === "OUT" ? direction : undefined,
    unallocated_only: params.get("unallocated_only") === "true",
    offset: Number.isInteger(offset) && offset > 0 ? offset : 0,
  };
}

export function movementFiltersToParams(f: MovementFilters): URLSearchParams {
  const p = new URLSearchParams({ from: f.from, to: f.to });
  if (f.category) p.set("category", f.category);
  if (f.direction) p.set("direction", f.direction);
  if (f.unallocated_only) p.set("unallocated_only", "true");
  if (f.offset > 0) p.set("offset", String(f.offset));
  return p;
}

export function movementApiQuery(f: MovementFilters): string {
  const p = movementFiltersToParams(f);
  p.set("limit", String(PAGE_SIZE));
  return p.toString();
}
