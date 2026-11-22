import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { API } from "@/tests/msw/handlers";
import { ConfirmProvider } from "@/components/patterns/ConfirmDialog";
import { SettleFlowProvider } from "@/components/entity/settle-flow";
import { ObligationPage } from "./ObligationPage";

const toasts = vi.hoisted(() => ({ calls: [] as { message: string; options?: { action?: { onClick: () => void } } }[] }));
vi.mock("sonner", () => ({
  toast: Object.assign((message: string, options?: { action?: { onClick: () => void } }) => void toasts.calls.push({ message, options }), { success: vi.fn(), error: vi.fn(), warning: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/contas/o1",
  useSearchParams: () => new URLSearchParams(),
}));

const detail = {
  id: "o1",
  direction: "RECEIVABLE",
  origin: { type: "SALE", id: "s1", label: "Venda nº 98 · Alejandra" },
  counterparty: { type: "CUSTOMER", id: "c1", name: "Alejandra Souza" },
  amount: 3200,
  settled: 1600,
  open: 1600,
  status: "PARTIAL",
  due_date: "2026-12-30",
  overdue: false,
  next_installment: { due_date: "2026-12-10", amount_open: 1600 },
  notes: null,
  components: [{ type: "SALE_ITEMS", id: "x", label: "Venda nº 98", amount: 3200 }],
  installments: [
    { id: "i1", due_date: "2026-11-20", amount: 1600, payment_method: "PIX", notes: null, covered: 1600, status: "COVERED", overdue: false },
    { id: "i2", due_date: "2026-12-10", amount: 1600, payment_method: null, notes: null, covered: 0, status: "OPEN", overdue: false },
  ],
  settlements: [{ id: "st1", amount: 1600, movement: { id: "m1", occurred_on: "2026-11-20", amount: 1600, category: "SALE_RECEIPT", payment_method: "PIX" } }],
};

beforeEach(() => {
  toasts.calls.length = 0;
  server.use(http.get(`${API}/obligations/o1`, () => HttpResponse.json(detail)));
});

function renderPage() {
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <ConfirmProvider>
        <SettleFlowProvider>
          <ObligationPage id="o1" />
        </SettleFlowProvider>
      </ConfirmProvider>
    </SWRConfig>,
  );
}

describe("Conta (T14)", () => {
  it("mostra o resumo, o plano com a cobertura e as quitações", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "Conta a receber · Alejandra Souza" })).toBeInTheDocument();
    const plan = screen.getByRole("region", { name: "Parcelas" });
    expect(within(plan).getAllByRole("row")).toHaveLength(3);
    expect(screen.getByRole("region", { name: "Quitações" })).toHaveTextContent("Pix");
    expect(screen.getAllByRole("button", { name: "Receber" }).length).toBeGreaterThan(0);
  });

  it("desfazer a quitação oferece Desfazer, que refaz a MESMA movimentação (movement_id)", async () => {
    const user = userEvent.setup();
    let deleted = "";
    let restored: unknown;
    server.use(
      http.delete(`${API}/settlements/st1`, () => {
        deleted = "st1";
        return new HttpResponse(null, { status: 204 });
      }),
      http.post(`${API}/settlements`, async ({ request }) => {
        restored = await request.json();
        return HttpResponse.json({ movement: { id: "m1" }, obligations: [] }, { status: 201 });
      }),
    );
    renderPage();
    await user.click(await screen.findByRole("button", { name: /Desfazer a quitação de/ }));
    await vi.waitFor(() => expect(deleted).toBe("st1"));
    const undo = toasts.calls.find((c) => c.message.startsWith("Quitação desfeita"));
    undo?.options?.action?.onClick();
    await vi.waitFor(() => expect(restored).toEqual({ movement_id: "m1", allocations: [{ obligation_id: "o1", amount: 1600 }] }));
  });
});
