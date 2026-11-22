import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { API } from "@/tests/msw/handlers";
import { ConfirmProvider } from "@/components/patterns/ConfirmDialog";
import { HomePage } from "./HomePage";

const nav = vi.hoisted(() => ({ search: "", push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace, back: vi.fn() }),
  usePathname: () => "/hoje",
  useSearchParams: () => new URLSearchParams(nav.search),
}));

function renderHome() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <ConfirmProvider>
        <HomePage />
      </ConfirmProvider>
    </SWRConfig>,
  );
}

beforeEach(() => {
  nav.search = "";
  nav.push.mockReset();
  nav.replace.mockReset();
});

describe("Hoje (T01)", () => {
  it("agrupa as pendências por área, com o total e os vencidos de cada grupo", async () => {
    renderHome();
    const money = await screen.findByRole("region", { name: "Dinheiro" });
    expect(within(money).getByText("A receber até 29/11/2026")).toBeInTheDocument();
    expect(within(money).getByText("1 vencida")).toBeInTheDocument();
    expect(within(money).getByText(/3\.200,00 · 2/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Operação" })).toHaveTextContent("Entregas até 29/11/2026");
    expect(await screen.findByText(/Este mês/)).toBeInTheDocument();
  });

  it("o horizonte vai para a URL e muda o corte pedido à api", async () => {
    const user = userEvent.setup();
    const horizons: string[] = [];
    server.use(
      http.get(`${API}/pending-actions`, ({ request }) => {
        horizons.push(new URL(request.url).searchParams.get("horizon_days") ?? "");
        return HttpResponse.json({ today: "2026-11-22", horizon_days: 7, total_overdue: 0, groups: [] });
      }),
    );
    renderHome();
    await screen.findByText("Tudo em dia");
    expect(horizons[0]).toBe("7");
    await user.click(screen.getByRole("button", { name: "30 dias" }));
    expect(nav.replace).toHaveBeenCalledWith("/hoje?h=30", { scroll: false });
  });

  it("expande o grupo e a linha traz a ação que resolve: marcar entregue", async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(
      http.patch(`${API}/vendas/s1/delivery-status`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({});
      }),
    );
    renderHome();
    const ops = await screen.findByRole("region", { name: "Operação" });
    await user.click(within(ops).getByRole("button", { name: /Entregas/ }));
    expect(within(ops).getByRole("link", { name: "Venda nº 98 · Alejandra Souza" })).toHaveAttribute("href", "/vendas/s1");
    await user.click(within(ops).getByRole("button", { name: "Marcar entregue" }));
    await vi.waitFor(() => expect(body).toEqual({ delivery_status: "DELIVERED" }));
  });

  it("Receber abre o diálogo de recebimento da conta vencida", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API}/obligations/o1`, () =>
        HttpResponse.json({
          id: "o1",
          direction: "RECEIVABLE",
          origin: { type: "SALE", id: "s1", label: "Venda nº 98 · Alejandra" },
          counterparty: { type: "CUSTOMER", id: "c1", name: "Alejandra Souza" },
          amount: 1200,
          settled: 0,
          open: 1200,
          status: "OPEN",
          due_date: "2026-11-21",
          overdue: true,
          next_installment: null,
          notes: null,
        }),
      ),
    );
    renderHome();
    const money = await screen.findByRole("region", { name: "Dinheiro" });
    await user.click(within(money).getByRole("button", { name: /A receber/ }));
    await user.click(within(money).getByRole("button", { name: "Receber" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Receber — Alejandra Souza");
  });
});
