import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { QuickCreateProvider, clearQuickCreateRegistry, registerQuickCreate } from "../quick-create";
import { ItemsGrid } from "./ItemsGrid";
import type { ItemLine } from "./items-grid-model";

const rock: ItemLine = {
  key: "a", id: "a", kind: "PRODUCT", productId: "p1", serviceId: null, name: "Rock face", unit: "m²",
  quantity: 18, unitPrice: 269, unitCost: 165,
};

function Harness({ initial, mode = "quote", onLines, readOnly }: { initial: ItemLine[]; mode?: "quote" | "sale"; onLines?: (l: ItemLine[]) => void; readOnly?: boolean }) {
  const [lines, setLines] = useState(initial);
  return (
    <SWRConfig value={{ provider: () => new Map() }}>
      <ItemsGrid
        mode={mode}
        lines={lines}
        readOnly={readOnly}
        lockReason={(l) => (l.purchaseId ? "Item na Compra nº 12: só o preço muda." : null)}
        onChange={(l) => {
          setLines(l);
          onLines?.(l);
        }}
      />
    </SWRConfig>
  );
}

describe("ItemsGrid (quote)", () => {
  it("mostra total e margem por linha e o resumo (exemplo do T03)", () => {
    render(<Harness initial={[rock]} />);
    const grid = screen.getByRole("table", { name: "Items" });
    expect(within(grid).getByText("R$ 4.842,00")).toBeInTheDocument();
    expect(within(grid).getByText("38,7%")).toBeInTheDocument();
    expect(screen.getByText(/Custo estimado/)).toBeInTheDocument();
  });

  it("editar quantidade e preço atualiza total e margem", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[rock]} />);
    const qty = screen.getByRole("textbox", { name: "Quantidade de Rock face" });
    await user.clear(qty);
    await user.type(qty, "20");
    await user.tab();
    expect(screen.getAllByText("R$ 5.380,00").length).toBeGreaterThan(0);
  });

  it("a unidade vem do catálogo", async () => {
    render(<Harness initial={[{ ...rock, unit: null }]} />);
    expect(await screen.findByText("m²")).toBeInTheDocument();
  });

  it("remove a linha", async () => {
    const user = userEvent.setup();
    const onLines = vi.fn();
    render(<Harness initial={[rock]} onLines={onLines} />);
    await user.click(screen.getByRole("button", { name: "Remover Rock face" }));
    expect(onLines).toHaveBeenLastCalledWith([]);
  });

  it("uma busca acha produto OU serviço e traz preço e custo de referência", async () => {
    const user = userEvent.setup();
    const onLines = vi.fn();
    render(<Harness initial={[]} onLines={onLines} />);
    const search = screen.getByRole("combobox", { name: "Adicionar produto ou serviço" });
    await user.type(search, "Inst");
    await user.click(await screen.findByRole("option", { name: /Instalação/ }));
    expect(onLines).toHaveBeenLastCalledWith([
      expect.objectContaining({ kind: "SERVICE", serviceId: "sv1", productId: null, unitPrice: 50, unitCost: 30 }),
    ]);
    await user.type(search, "Rock");
    await user.click(await screen.findByRole("option", { name: /Rock face/ }));
    expect(onLines).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ kind: "PRODUCT", productId: "p1", unitPrice: 269 })]));
  });

  it("＋ Criar produto abre o cadastro e a linha entra com o criado", async () => {
    const user = userEvent.setup();
    const onLines = vi.fn();
    registerQuickCreate("product", {
      title: "Novo produto",
      Form: ({ formId, initialName, onSaved }) => (
        <form id={formId} onSubmit={(e) => { e.preventDefault(); onSaved({ id: "pn", nome: initialName ?? "", unidade: "m²", preco_referencia: 80, custo_referencia: 40, created_at: "" }); }}>
          <button type="submit">salvar</button>
        </form>
      ),
    });
    render(
      <QuickCreateProvider>
        <Harness initial={[]} onLines={onLines} />
      </QuickCreateProvider>,
    );
    await user.type(screen.getByRole("combobox", { name: "Adicionar produto ou serviço" }), "Ônix azul");
    expect(screen.getByRole("option", { name: /Usar "Ônix azul" sem cadastro/ })).toBeInTheDocument();
    await user.click(await screen.findByRole("option", { name: /Criar produto "Ônix azul"/ }));
    await user.click(await screen.findByRole("button", { name: "salvar" }));
    expect(onLines).toHaveBeenLastCalledWith([expect.objectContaining({ productId: "pn", name: "Ônix azul", unitPrice: 80, unitCost: 40 })]);
    clearQuickCreateRegistry();
  });
});

describe("ItemsGrid (sale)", () => {
  const locked: ItemLine = { ...rock, purchaseId: "pu1" };
  it("Item numa compra explica a trava antes de editar e só o preço muda", () => {
    render(<Harness mode="sale" initial={[locked]} />);
    expect(screen.getByText("Item na Compra nº 12: só o preço muda.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Quantidade de Rock face" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Preço unitário de Rock face" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Remover Rock face" })).toBeDisabled();
  });

  it("custo e margem ficam atrás de um botão", async () => {
    const user = userEvent.setup();
    render(<Harness mode="sale" initial={[rock]} />);
    expect(screen.queryByText("Margem")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mostrar custo e margem" }));
    expect(screen.getByRole("columnheader", { name: "Margem" })).toBeInTheDocument();
  });

  it("somente leitura: sem campos nem busca", () => {
    render(<Harness mode="sale" readOnly initial={[rock]} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
