import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { API } from "@/tests/msw/handlers";
import { PurchaseQueue } from "./PurchaseQueue";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/compras",
  useSearchParams: () => new URLSearchParams("tab=a-comprar"),
}));

function renderQueue() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <PurchaseQueue />
    </SWRConfig>,
  );
}

beforeEach(() => nav.push.mockReset());

describe("A comprar (T11)", () => {
  it("agrupa por fornecedor, com o custo do que está marcado, e deixa o grupo sem fornecedor por último", async () => {
    renderQueue();
    const group = await screen.findByRole("region", { name: "A comprar de Matheus RJ" });
    expect(group).toHaveTextContent("2 itens");
    expect(within(group).getByText(/2 de 2 marcados/)).toBeInTheDocument();
    const regions = screen.getAllByRole("region");
    expect(regions.at(-1)).toHaveAccessibleName("Sem fornecedor definido");
  });

  it("gera a compra só com os itens marcados e abre a compra criada", async () => {
    const user = userEvent.setup();
    let body: { supplier_id: string; sale_item_ids: string[] } | null = null;
    server.use(
      http.post(`${API}/purchases`, async ({ request }) => {
        body = (await request.json()) as typeof body;
        return HttpResponse.json({ id: "pu9", number: 13 }, { status: 201 });
      }),
    );
    renderQueue();
    const group = await screen.findByRole("region", { name: "A comprar de Matheus RJ" });
    await user.click(within(group).getByRole("checkbox", { name: /Incluir Rock face de Bruno Lima/ }));
    expect(within(group).getByText(/1 de 2 marcados/)).toBeInTheDocument();
    await user.click(within(group).getByRole("button", { name: /Gerar compra · 1 item/ }));
    await vi.waitFor(() => expect(nav.push).toHaveBeenCalledWith("/compras/pu9"));
    expect(body).toMatchObject({ supplier_id: "f1", sale_item_ids: ["si1"], kind: "MADE_TO_ORDER" });
  });

  it("oferece adicionar à compra aberta do mesmo fornecedor", async () => {
    const user = userEvent.setup();
    let attached: string[] = [];
    server.use(
      http.post(`${API}/purchases/pu1/sale-items`, async ({ request }) => {
        attached = ((await request.json()) as { sale_item_ids: string[] }).sale_item_ids;
        return HttpResponse.json({});
      }),
    );
    renderQueue();
    const group = await screen.findByRole("region", { name: "A comprar de Matheus RJ" });
    await user.click(await within(group).findByRole("button", { name: /Adicionar à Compra nº 12/ }));
    await vi.waitFor(() => expect(attached).toEqual(["si1", "si2"]));
  });

  it("o grupo sem fornecedor leva ao atendimento da venda", async () => {
    renderQueue();
    const group = await screen.findByRole("region", { name: "Sem fornecedor definido" });
    expect(within(group).getByRole("link", { name: "Moledo" })).toHaveAttribute("href", "/vendas/s3?atendimento=1");
  });
});
