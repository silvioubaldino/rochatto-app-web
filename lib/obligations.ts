import type {
  CounterpartyType,
  MovementCategory,
  Obligation,
  ObligationDirection,
} from "./types";

// Filtros, seleção e conferências puras das telas de contas e movimentações (AYD-007).
// Valor, quitado, em aberto e status vêm calculados da API; aqui só há conveniências de
// formulário e de URL.

export const PAGE_SIZE = 50;

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

// --- Movimentações ----------------------------------------------------------

export interface MovementFilters {
  from: string;
  to: string;
  category?: MovementCategory;
  direction?: "IN" | "OUT";
  unallocated_only: boolean;
  offset: number;
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
