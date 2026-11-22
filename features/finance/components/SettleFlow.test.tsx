import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { API } from "@/tests/msw/handlers";
import type { Obligation } from "@/lib/types";
import { SettleFlow } from "./SettleFlow";

const toasts = vi.hoisted(() => ({ calls: [] as { message: string; options?: { action?: { onClick: () => void } } }[] }));
vi.mock("sonner", () => ({
  toast: Object.assign((message: string, options?: { action?: { onClick: () => void } }) => void toasts.calls.push({ message, options }), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

const obligation = (id: string, open: number, name = "Matheus RJ", counterpartyId = "f1"): Obligation =>
  ({
    id,
    direction: "PAYABLE",
    origin: { type: "PURCHASE", id: "pu1", label: "Compra nº 12" },
    counterparty: { type: "SUPPLIER", id: counterpartyId, name },
    amount: open,
    settled: 0,
    open,
    status: "OPEN",
    due_date: null,
    overdue: false,
    next_installment: null,
    notes: null,
  }) as Obligation;

function renderFlow(obligations: Obligation[], onClose = vi.fn()) {
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <SettleFlow obligations={obligations} onClose={onClose} />
    </SWRConfig>,
  );
  return onClose;
}

beforeEach(() => {
  toasts.calls.length = 0;
});

describe("Pagar/Receber (SettleFlow)", () => {
  it("exige a forma de pagamento antes de registrar", async () => {
    const user = userEvent.setup();
    renderFlow([obligation("o1", 1200)]);
    const dialog = await screen.findByRole("dialog", { name: "Pagar — Matheus RJ" });
    await user.click(within(dialog).getByRole("button", { name: /^Pagar R\$/ }));
    expect(await within(dialog).findByText("Escolha a forma de pagamento")).toBeInTheDocument();
  });

  it("um Pix quita várias contas, e o toast oferece Desfazer (anula a movimentação)", async () => {
    const user = userEvent.setup();
    let body: unknown;
    let voided = "";
    server.use(
      http.post(`${API}/settlements`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ movement: { id: "m1" }, obligations: [] }, { status: 201 });
      }),
      http.delete(`${API}/financial-movements/m1`, () => {
        voided = "m1";
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const onClose = renderFlow([obligation("o1", 1200), obligation("o2", 300.5)]);
    const dialog = await screen.findByRole("dialog", { name: "Pagar 2 contas" });
    expect(dialog).toHaveTextContent("1.500,50");
    await user.click(within(dialog).getByRole("combobox", { name: "Forma de pagamento" }));
    await user.click(await screen.findByRole("option", { name: "Pix" }));
    await user.click(within(dialog).getByRole("button", { name: /^Pagar R\$/ }));

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(body).toMatchObject({
      movement: { payment_method: "PIX" },
      allocations: [{ obligation_id: "o1", amount: 1200 }, { obligation_id: "o2", amount: 300.5 }],
    });
    const undo = toasts.calls.find((c) => c.message.startsWith("Pagamento de"));
    expect(undo?.message).toContain("(2 contas)");
    undo?.options?.action?.onClick();
    await vi.waitFor(() => expect(voided).toBe("m1"));
  });

  it("avisa quando as contas são de credores diferentes e mostra o 409 no próprio diálogo", async () => {
    const user = userEvent.setup();
    server.use(http.post(`${API}/settlements`, () => HttpResponse.json({ error: "Movimentação sem saldo livre." }, { status: 409 })));
    const onClose = renderFlow([obligation("o1", 100), obligation("o2", 50, "Nivaldo", "f2")]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("note")).toHaveTextContent(/credores diferentes/);
    await user.click(within(dialog).getByRole("combobox", { name: "Forma de pagamento" }));
    await user.click(await screen.findByRole("option", { name: "Pix" }));
    await user.click(within(dialog).getByRole("button", { name: /^Pagar R\$/ }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Movimentação sem saldo livre.");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("não deixa misturar a pagar com a receber", async () => {
    renderFlow([obligation("o1", 100), { ...obligation("o2", 50), direction: "RECEIVABLE" }]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("alert")).toHaveTextContent(/só contas a pagar ou só contas a receber/);
    expect(within(dialog).getByRole("button", { name: /^(Pagar|Receber) R\$/ })).toBeDisabled();
  });
});
