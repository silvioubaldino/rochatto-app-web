import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { API } from "@/tests/msw/handlers";
import { MovementDialog } from "./MovementDialog";

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), warning: vi.fn() }) }));

function renderDialog(props: Partial<Parameters<typeof MovementDialog>[0]> = {}) {
  const onClose = vi.fn();
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <MovementDialog kind="EXPENSE" onClose={onClose} {...props} />
    </SWRConfig>,
  );
  return onClose;
}

describe("Despesa e receita avulsa (T14)", () => {
  it("a despesa oferece só categorias de saída e lança o valor com sinal negativo", async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(
      http.post(`${API}/financial-movements`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: "m3" }, { status: 201 });
      }),
    );
    const onClose = renderDialog();
    const dialog = await screen.findByRole("dialog", { name: "Nova despesa" });
    await user.click(within(dialog).getByRole("combobox", { name: "Categoria" }));
    const options = (await screen.findAllByRole("option")).map((o) => o.textContent);
    expect(options).toContain("Veículo");
    expect(options).not.toContain("Outra receita");
    await user.click(screen.getByRole("option", { name: "Veículo" }));
    await user.type(within(dialog).getByRole("textbox", { name: /Valor/ }), "150");
    await user.click(within(dialog).getByRole("button", { name: "Lançar" }));
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(body).toMatchObject({ category: "VEHICLE", amount: -150, payment_method: null });
  });

  it("a receita avulsa só oferece a categoria de entrada e o valor entra positivo", async () => {
    const user = userEvent.setup();
    renderDialog({ kind: "INCOME" });
    const dialog = await screen.findByRole("dialog", { name: "Nova receita avulsa" });
    await user.click(within(dialog).getByRole("combobox", { name: "Categoria" }));
    expect((await screen.findAllByRole("option")).map((o) => o.textContent)).toEqual(["Outra receita"]);
  });

  it("pede a categoria e um valor maior que zero", async () => {
    const user = userEvent.setup();
    renderDialog();
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Lançar" }));
    expect(await within(dialog).findByText("Escolha a categoria")).toBeInTheDocument();
    expect(within(dialog).getByText("Valor deve ser maior que zero")).toBeInTheDocument();
  });
});
