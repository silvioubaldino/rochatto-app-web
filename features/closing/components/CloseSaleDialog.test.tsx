import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { ApiError } from "@/lib/errors";
import type { ClosingRequest } from "@/lib/types";
import type { ClosingItem } from "../model";
import { CloseSaleDialog } from "./CloseSaleDialog";

const items: ClosingItem[] = [
  { ref: { quoteItemId: "i1" }, kind: "PRODUCT", productId: "p1", name: "Rock face", unit: "m²", quantity: 18, unitPrice: 269, unitCost: 165 },
  { ref: { quoteItemId: "i2" }, kind: "PRODUCT", productId: "p2", name: "Moledo", unit: "m²", quantity: 10, unitPrice: 100, unitCost: 60 },
  { ref: { quoteItemId: "i3" }, kind: "SERVICE", productId: null, name: "Instalação", unit: "m²", quantity: 18, unitPrice: 50, unitCost: 30 },
];

function setup(over: { error?: unknown; submit?: (c: ClosingRequest) => Promise<{ sale_id: string; quote_id: string } | undefined> } = {}) {
  const submit = vi.fn(over.submit ?? (async () => ({ sale_id: "s9", quote_id: "q1" })));
  const onClosed = vi.fn();
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <CloseSaleDialog
        open
        onOpenChange={() => {}}
        heading="Orçamento nº 154 · Alejandra"
        items={items}
        chargesTotal={100}
        submit={submit}
        pending={false}
        error={over.error ?? null}
        onClosed={onClosed}
      />
    </SWRConfig>,
  );
  return { submit, onClosed };
}

describe("CloseSaleDialog (T05)", () => {
  it("mostra o título, as 4 seções e o lucro previsto ao vivo", async () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: "Fechar venda" });
    expect(dialog).toHaveTextContent("Orçamento nº 154 · Alejandra · R$ 6.842,00");
    for (const name of ["Atendimento dos Items", "Entrega", "Recebimento", "Custos previstos (opcional)"]) {
      expect(within(dialog).getByRole("heading", { name: new RegExp(name.replace(/[()]/g, "\\$&")) })).toBeInTheDocument();
    }
    // preço 6.842 − custos 4.110 = 2.732
    expect(within(dialog).getByText("R$ 2.732,00")).toBeInTheDocument();
  });

  it("fechar sem tocar em nada: sob encomenda com o fornecedor habitual, plano 50/50 e sem entrada paga", async () => {
    const user = userEvent.setup();
    const { submit, onClosed } = setup();
    await screen.findByDisplayValue("Matheus RJ"); // fornecedor habitual do Rock face (C8)
    await user.click(screen.getByRole("button", { name: "Fechar venda" }));
    expect(submit).toHaveBeenCalledTimes(1);
    const closing = submit.mock.calls[0][0];
    expect(closing.items).toEqual([
      { quote_item_id: "i1", origin: "MADE_TO_ORDER", supplier_id: "f1" },
      { quote_item_id: "i2", origin: "MADE_TO_ORDER" },
      { quote_item_id: "i3" },
    ]);
    expect(closing.receivable_plan?.installments).toHaveLength(2);
    expect(closing.receivable_plan?.installments.map((i) => i.amount)).toEqual([3421, 3421]);
    expect(closing.down_payment).toBeUndefined();
    expect(onClosed).toHaveBeenCalledWith({ sale_id: "s9", quote_id: "q1" });
  });

  it("“Recebi a entrada agora” pede a forma de pagamento e aponta a seção; com ela, envia a entrada", async () => {
    const user = userEvent.setup();
    const { submit } = setup();
    await user.click(screen.getByRole("checkbox", { name: /Recebi a entrada agora/ }));
    await user.click(screen.getByRole("button", { name: "Fechar venda" }));
    const section = screen.getByRole("heading", { name: /Recebimento/ }).closest("section") as HTMLElement;
    expect(within(section).getByRole("alert")).toHaveTextContent(/forma de pagamento/);
    expect(submit).not.toHaveBeenCalled();

    await user.click(screen.getByRole("combobox", { name: "Forma de pagamento" }));
    await user.click(await screen.findByRole("option", { name: "Pix" }));
    await user.click(screen.getByRole("button", { name: "Fechar venda" }));
    expect(submit.mock.calls[0][0].down_payment).toMatchObject({ amount: 3421, payment_method: "PIX" });
  });

  it("do estoque sem saldo avisa quanto falta, sem bloquear", async () => {
    const user = userEvent.setup();
    setup();
    const moledo = screen.getByRole("radiogroup", { name: "Origem de Moledo" });
    await user.click(within(moledo).getByRole("radio", { name: "De estoque" }));
    expect(await screen.findByText(/no estoque — a venda é permitida/)).toHaveTextContent("Faltam 6 m²");
  });

  it("erro da api com `field` aparece na seção certa", () => {
    setup({ error: new ApiError(400, "Fornecedor inválido para o Item.", "closing.items[1].supplier_id") });
    const section = screen.getByRole("heading", { name: /Atendimento dos Items/ }).closest("section") as HTMLElement;
    expect(within(section).getByRole("alert")).toHaveTextContent("Fornecedor inválido para o Item.");
    const other = screen.getByRole("heading", { name: /Recebimento/ }).closest("section") as HTMLElement;
    expect(within(other).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("erro sem seção (ex.: 409 geral) aparece no topo", () => {
    setup({ error: new ApiError(409, "Σ parcelas passa do preço.") });
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent("Σ parcelas passa do preço.");
  });
});
