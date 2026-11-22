"use client";

import { useCallback } from "react";
import { useSWRConfig } from "swr";

/**
 * Invalidação declarativa por eventos de domínio (AYD-011 §9.4 regra 3).
 *
 * Toda mutação declara QUAIS eventos emite; este módulo é a FONTE ÚNICA do mapa
 * evento → chaves SWR a revalidar. Proibido revalidar chaves à mão fora daqui.
 * As chaves SWR do app são os caminhos da api (ex.: `/vendas?cliente_id=…`).
 */
export type DomainEvent =
  | "SALE_CHANGED"
  | "QUOTE_CHANGED"
  | "PURCHASE_CHANGED"
  | "MONEY_MOVED"
  | "STOCK_CHANGED"
  | "CATALOG_CHANGED"
  | "CUSTOMER_CHANGED"
  | "PARTNER_CHANGED"
  | "SUPPLIER_CHANGED";

/** Prefixos de caminho da api afetados por cada evento. */
export const EVENT_PATHS: Record<DomainEvent, readonly string[]> = {
  // Venda mexe em fila de compra, estoque (outflow), contas e painéis.
  SALE_CHANGED: ["/vendas", "/quotes", "/purchases", "/stock", "/obligations", "/finance", "/dashboard", "/relatorios"],
  QUOTE_CHANGED: ["/quotes", "/dashboard", "/relatorios"],
  PURCHASE_CHANGED: [
    "/purchases",
    "/stock",
    "/vendas",
    "/obligations",
    "/financial-movements",
    "/finance",
    "/dashboard",
  ],
  // Pagar/receber/parcelar: contas, movimentações, painéis, Sales e Purchases (saldos).
  MONEY_MOVED: ["/obligations", "/financial-movements", "/finance", "/vendas", "/purchases", "/dashboard"],
  STOCK_CHANGED: ["/stock", "/vendas", "/finance"],
  CATALOG_CHANGED: ["/produtos", "/services", "/product-categories", "/stock", "/relatorios"],
  CUSTOMER_CHANGED: ["/clientes", "/quotes", "/vendas"],
  PARTNER_CHANGED: ["/partners", "/clientes", "/quotes", "/vendas"],
  SUPPLIER_CHANGED: ["/fornecedores", "/purchases", "/obligations"],
};

function hasPathPrefix(key: string, prefix: string): boolean {
  return key === prefix || key.startsWith(`${prefix}/`) || key.startsWith(`${prefix}?`);
}

/** A chave SWR `key` é revalidada pelo `event`? (chaves não-string nunca casam.) */
export function matchesEvent(event: DomainEvent, key: unknown): boolean {
  return typeof key === "string" && EVENT_PATHS[event].some((p) => hasPathPrefix(key, p));
}

/** A chave é afetada por algum dos eventos? */
export function matchesAnyEvent(events: readonly DomainEvent[], key: unknown): boolean {
  return events.some((e) => matchesEvent(e, key));
}

/** Predicado de chave para `mutate(filter)` do SWR. */
export function eventKeyFilter(events: DomainEvent | readonly DomainEvent[]): (key: unknown) => boolean {
  const list = typeof events === "string" ? [events] : events;
  return (key) => matchesAnyEvent(list, key);
}

/**
 * `const emit = useEmit(); await emit("SALE_CHANGED")` — revalida todas as chaves SWR
 * afetadas pelos eventos. Chamado por `mutations.ts` / `useApiMutation` após a escrita.
 */
export function useEmit(): (events: DomainEvent | readonly DomainEvent[]) => Promise<void> {
  const { mutate } = useSWRConfig();
  return useCallback(
    async (events) => {
      await mutate(eventKeyFilter(events));
    },
    [mutate],
  );
}
