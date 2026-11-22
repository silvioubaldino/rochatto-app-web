import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, type DataTableColumn } from "./DataTable";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/vendas",
  useSearchParams: () => new URLSearchParams(),
}));

interface Sale {
  id: string;
  number: number;
  customer: string;
  city: string;
  total: number;
  status: string;
}

const rows: Sale[] = [
  { id: "a", number: 98, customer: "Alejandra", city: "Bonito", total: 4780, status: "A entregar" },
  { id: "b", number: 99, customer: "Bruno", city: "Campo Grande", total: 1200, status: "Entregue" },
  { id: "c", number: 100, customer: "Carla", city: "Bonito", total: 300, status: "A entregar" },
];

const columns: DataTableColumn<Sale>[] = [
  { id: "number", header: "Nº", cell: (r) => `Venda nº ${r.number}`, sortValue: (r) => r.number, phone: "title" },
  { id: "customer", header: "Cliente", cell: (r) => r.customer, phone: "subtitle", sortValue: (r) => r.customer },
  { id: "city", header: "Cidade", cell: (r) => r.city, phone: "meta" },
  { id: "total", header: "Total", cell: (r) => `R$ ${r.total}`, align: "right", phone: "value", sortValue: (r) => r.total, footer: "R$ 6280" },
  { id: "status", header: "Entrega", cell: (r) => r.status, phone: "badge" },
];

const base = { columns, rows, rowKey: (r: Sale) => r.id, caption: "Vendas" };

describe("DataTable — desktop", () => {
  it("renderiza tabela com cabeçalhos, linhas e rodapé de totais", () => {
    render(<DataTable {...base} mode="table" />);
    expect(screen.getByRole("table", { name: "Vendas" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Nº", "Cliente", "Cidade", "Total", "Entrega"]);
    expect(screen.getAllByRole("row")).toHaveLength(1 + 3 + 1);
    expect(screen.getByText("R$ 6280")).toBeInTheDocument();
  });

  it("a linha é um LINK real (abre em nova aba, teclado)", () => {
    render(<DataTable {...base} mode="table" rowHref={(r) => `/vendas/${r.id}`} />);
    const link = screen.getByRole("link", { name: "Venda nº 98" });
    expect(link).toHaveAttribute("href", "/vendas/a");
  });

  it("ordena ao clicar no cabeçalho e atualiza aria-sort", async () => {
    const user = userEvent.setup();
    render(<DataTable {...base} mode="table" />);
    const totalHeader = screen.getByRole("columnheader", { name: /Total/ });
    await user.click(within(totalHeader).getByRole("button"));
    expect(totalHeader).toHaveAttribute("aria-sort", "ascending");
    const firstCells = screen.getAllByRole("row").slice(1, 4).map((r) => within(r).getAllByRole("cell")[0].textContent);
    expect(firstCells).toEqual(["Venda nº 100", "Venda nº 99", "Venda nº 98"]);
    await user.click(within(totalHeader).getByRole("button"));
    expect(totalHeader).toHaveAttribute("aria-sort", "descending");
  });

  it("agrupa com cabeçalho recolhível e resumo", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        {...base}
        mode="table"
        grouping={{
          keyOf: (r) => r.city,
          label: (key, g) => `${key} (${g.length})`,
          summary: (_k, g) => `R$ ${g.reduce((a, r) => a + r.total, 0)}`,
        }}
      />,
    );
    const toggle = screen.getByRole("button", { name: /Bonito \(2\)/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Venda nº 98")).toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Venda nº 98")).not.toBeInTheDocument();
    expect(screen.getByText("Venda nº 99")).toBeInTheDocument();
  });

  it("as ações do grupo ficam ao lado do cabeçalho, fora do botão que recolhe", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        {...base}
        mode="table"
        grouping={{ keyOf: (r) => r.city, label: (key) => key, actions: (key) => <button type="button">Pagar tudo de {key}</button> }}
      />,
    );
    const toggle = screen.getByRole("button", { name: "Bonito" });
    const action = screen.getByRole("button", { name: "Pagar tudo de Bonito" });
    expect(toggle).not.toContainElement(action);
    await user.click(toggle);
    expect(action).toBeInTheDocument();
  });
});

describe("DataTable — celular (cartões)", () => {
  it("vira lista de cartões, sem tabela nem rolagem lateral", () => {
    render(<DataTable {...base} mode="cards" rowHref={(r) => `/vendas/${r.id}`} summary="Total R$ 6280" />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Vendas" });
    const cards = within(list).getAllByRole("listitem");
    expect(cards).toHaveLength(3);
    const first = cards[0];
    expect(within(first).getByRole("link", { name: "Venda nº 98" })).toHaveAttribute("href", "/vendas/a");
    expect(within(first).getByText("Alejandra")).toBeInTheDocument();
    expect(within(first).getByText("R$ 4780")).toBeInTheDocument();
    expect(within(first).getByText("A entregar")).toBeInTheDocument();
    expect(within(first).getByText("Bonito")).toBeInTheDocument();
    expect(screen.getByText("Total R$ 6280")).toBeInTheDocument();
  });

  it("modo auto usa cartões quando a tela é de celular", async () => {
    window.matchMedia = ((query: string) =>
      ({
        matches: true,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    render(<DataTable {...base} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("agrupamento também recolhe no celular", async () => {
    const user = userEvent.setup();
    render(<DataTable {...base} mode="cards" grouping={{ keyOf: (r) => r.city, label: (k) => k }} />);
    await user.click(screen.getByRole("button", { name: "Bonito" }));
    expect(screen.queryByText("Venda nº 98")).not.toBeInTheDocument();
    expect(screen.getByText("Venda nº 99")).toBeInTheDocument();
  });
});

describe("DataTable — estados", () => {
  it("vazio com ação", () => {
    render(<DataTable {...base} rows={[]} empty={{ title: "Nenhuma venda", action: { label: "Criar orçamento", href: "/orcamentos/novo" } }} />);
    expect(screen.getByText("Nenhuma venda")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Criar orçamento" })).toHaveAttribute("href", "/orcamentos/novo");
  });

  it("erro com tentar de novo", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<DataTable {...base} error={new Error("x")} onRetry={retry} />);
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(retry).toHaveBeenCalled();
  });

  it("carregando mostra esqueleto (não spinner de página)", () => {
    render(<DataTable {...base} isLoading />);
    expect(screen.getByLabelText("Carregando")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
