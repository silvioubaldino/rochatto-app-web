import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "./FilterBar";
import { ResponsiveDialog } from "./ResponsiveDialog";

describe("FilterBar", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("chips: marcam o ativo (aria-pressed) e disparam onChange", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onChange = vi.fn();
    render(
      <FilterBar
        chips={[
          {
            label: "Situação",
            value: "TO_DELIVER",
            onChange,
            options: [
              { value: "TO_DELIVER", label: "A entregar" },
              { value: "LATE", label: "Atrasadas" },
              { value: "", label: "Todas" },
            ],
          },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "A entregar" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Atrasadas" }));
    expect(onChange).toHaveBeenCalledWith("LATE");
  });

  it("busca com debounce de 300 ms", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onChange = vi.fn();
    render(<FilterBar search={{ value: "", onChange, placeholder: "Buscar venda" }} />);
    await user.type(screen.getByRole("searchbox", { name: "Buscar venda" }), "ale");
    expect(onChange).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(300));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("ale");
  });

  it('"Limpar (N)" só aparece com filtros ativos', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onClear = vi.fn();
    const { rerender } = render(<FilterBar activeCount={0} onClear={onClear} />);
    expect(screen.queryByRole("button", { name: /Limpar/ })).not.toBeInTheDocument();
    rerender(<FilterBar activeCount={2} onClear={onClear} />);
    await user.click(screen.getByRole("button", { name: "Limpar (2)" }));
    expect(onClear).toHaveBeenCalled();
  });

  it("filtros avançados ficam num painel recolhível", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FilterBar>
        <label>
          Cidade <input />
        </label>
      </FilterBar>,
    );
    expect(screen.queryByLabelText("Cidade")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Filtros" }));
    expect(screen.getByLabelText("Cidade")).toBeInTheDocument();
  });
});

describe("ResponsiveDialog", () => {
  it("título, conteúdo, rodapé fixo e fechar", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ResponsiveDialog open onOpenChange={onOpenChange} title="Fechar venda" footer={<button>Confirmar</button>}>
        <p>corpo</p>
      </ResponsiveDialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "Fechar venda" });
    expect(dialog).toHaveTextContent("corpo");
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
    // celular: tela cheia com voltar; desktop: caixa com X — as duas ações existem no DOM
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("dismissible=false impede fechar (ex.: salvando)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ResponsiveDialog open onOpenChange={onOpenChange} title="Salvando" dismissible={false}>
        x
      </ResponsiveDialog>,
    );
    await user.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
