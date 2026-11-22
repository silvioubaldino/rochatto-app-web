import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import useSWR, { SWRConfig } from "swr";
import type { ReactNode } from "react";
import { EVENT_PATHS, eventKeyFilter, matchesAnyEvent, matchesEvent, useEmit, type DomainEvent } from "./events";

describe("mapa evento → chaves SWR", () => {
  it("casa prefixo de caminho com ou sem query", () => {
    expect(matchesEvent("SALE_CHANGED", "/vendas")).toBe(true);
    expect(matchesEvent("SALE_CHANGED", "/vendas?cliente_id=1")).toBe(true);
    expect(matchesEvent("SALE_CHANGED", "/vendas/abc")).toBe(true);
  });

  it("não casa prefixo parcial nem chave de outro domínio", () => {
    expect(matchesEvent("SALE_CHANGED", "/vendasx")).toBe(false);
    expect(matchesEvent("CATALOG_CHANGED", "/vendas")).toBe(false);
    expect(matchesEvent("SALE_CHANGED", "/clientes")).toBe(false);
  });

  it("chaves que não são string nunca casam", () => {
    expect(matchesEvent("SALE_CHANGED", ["/vendas"])).toBe(false);
    expect(matchesEvent("SALE_CHANGED", null)).toBe(false);
  });

  it("MONEY_MOVED revalida contas, movimentações, painéis, vendas e compras", () => {
    for (const key of ["/obligations?direction=PAYABLE", "/financial-movements", "/finance/summary?from=1", "/vendas/1", "/purchases/2", "/dashboard/kpis"]) {
      expect(matchesEvent("MONEY_MOVED", key)).toBe(true);
    }
  });

  it("cadastros revalidam só a própria família (e dependentes)", () => {
    expect(matchesEvent("CUSTOMER_CHANGED", "/clientes/search?q=a")).toBe(true);
    expect(matchesEvent("CUSTOMER_CHANGED", "/quotes")).toBe(true); // nome do cliente aparece
    expect(matchesEvent("SUPPLIER_CHANGED", "/fornecedores?kind=STONE")).toBe(true);
    expect(matchesEvent("PARTNER_CHANGED", "/partners")).toBe(true);
    expect(matchesEvent("CATALOG_CHANGED", "/produtos")).toBe(true);
    expect(matchesEvent("CATALOG_CHANGED", "/services?q=x")).toBe(true);
    expect(matchesEvent("STOCK_CHANGED", "/stock/balance")).toBe(true);
    expect(matchesEvent("QUOTE_CHANGED", "/quotes/1")).toBe(true);
    expect(matchesEvent("PURCHASE_CHANGED", "/purchases/pending-sale-items")).toBe(true);
  });

  it("todo evento tem ao menos um prefixo e todos começam com /", () => {
    for (const [event, paths] of Object.entries(EVENT_PATHS)) {
      expect(paths.length, event).toBeGreaterThan(0);
      for (const p of paths) expect(p.startsWith("/")).toBe(true);
    }
  });

  it("matchesAnyEvent e eventKeyFilter combinam eventos", () => {
    const events: DomainEvent[] = ["QUOTE_CHANGED", "STOCK_CHANGED"];
    expect(matchesAnyEvent(events, "/stock/balance")).toBe(true);
    expect(matchesAnyEvent(events, "/partners")).toBe(false);
    expect(eventKeyFilter("CATALOG_CHANGED")("/produtos")).toBe(true);
    expect(eventKeyFilter(events)("/quotes")).toBe(true);
  });
});

describe("useEmit", () => {
  it("revalida só as chaves do evento", async () => {
    const fetcher = vi.fn(async (key: string) => `data:${key}`);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SWRConfig value={{ provider: () => new Map(), fetcher, dedupingInterval: 0 }}>{children}</SWRConfig>
    );
    const { result } = renderHook(
      () => {
        useSWR("/vendas");
        useSWR("/produtos");
        return useEmit();
      },
      { wrapper },
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    fetcher.mockClear();

    await act(async () => {
      await result.current("CATALOG_CHANGED");
    });

    expect(fetcher).toHaveBeenCalledWith("/produtos");
    expect(fetcher).not.toHaveBeenCalledWith("/vendas");
  });

  it("aceita vários eventos", async () => {
    const fetcher = vi.fn(async (key: string) => `data:${key}`);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SWRConfig value={{ provider: () => new Map(), fetcher, dedupingInterval: 0 }}>{children}</SWRConfig>
    );
    const { result } = renderHook(
      () => {
        useSWR("/vendas");
        useSWR("/produtos");
        useSWR("/partners");
        return useEmit();
      },
      { wrapper },
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
    fetcher.mockClear();

    await act(async () => {
      await result.current(["SALE_CHANGED", "CATALOG_CHANGED"]);
    });

    expect(fetcher).toHaveBeenCalledWith("/vendas");
    expect(fetcher).toHaveBeenCalledWith("/produtos");
    expect(fetcher).not.toHaveBeenCalledWith("/partners");
  });
});
