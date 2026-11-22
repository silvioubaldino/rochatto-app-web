"use client";

import { useCallback } from "react";
import { useSWRConfig } from "swr";

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

export const EVENT_PATHS: Record<DomainEvent, readonly string[]> = {
  SALE_CHANGED: ["/vendas", "/quotes", "/purchases", "/stock", "/obligations", "/finance", "/dashboard", "/relatorios", "/pending-actions"],
  QUOTE_CHANGED: ["/quotes", "/dashboard", "/relatorios", "/pending-actions"],
  PURCHASE_CHANGED: [
    "/purchases",
    "/stock",
    "/vendas",
    "/obligations",
    "/financial-movements",
    "/finance",
    "/dashboard",
    "/pending-actions",
  ],
  MONEY_MOVED: [
    "/obligations",
    "/financial-movements",
    "/finance",
    "/vendas",
    "/purchases",
    "/dashboard",
    "/pending-actions",
  ],
  STOCK_CHANGED: ["/stock", "/vendas", "/finance", "/pending-actions"],
  CATALOG_CHANGED: ["/produtos", "/services", "/product-categories", "/stock", "/relatorios"],
  CUSTOMER_CHANGED: ["/clientes", "/quotes", "/vendas"],
  PARTNER_CHANGED: ["/partners", "/clientes", "/quotes", "/vendas"],
  SUPPLIER_CHANGED: ["/fornecedores", "/purchases", "/obligations"],
};

function hasPathPrefix(key: string, prefix: string): boolean {
  return key === prefix || key.startsWith(`${prefix}/`) || key.startsWith(`${prefix}?`);
}

export function matchesEvent(event: DomainEvent, key: unknown): boolean {
  return typeof key === "string" && EVENT_PATHS[event].some((p) => hasPathPrefix(key, p));
}

export function matchesAnyEvent(events: readonly DomainEvent[], key: unknown): boolean {
  return events.some((e) => matchesEvent(e, key));
}

export function eventKeyFilter(events: DomainEvent | readonly DomainEvent[]): (key: unknown) => boolean {
  const list = typeof events === "string" ? [events] : events;
  return (key) => matchesAnyEvent(list, key);
}

export function useEmit(): (events: DomainEvent | readonly DomainEvent[]) => Promise<void> {
  const { mutate } = useSWRConfig();
  return useCallback(
    async (events) => {
      await mutate(eventKeyFilter(events));
    },
    [mutate],
  );
}
