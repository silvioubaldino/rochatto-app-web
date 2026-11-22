import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("com href vira um link real para a lista que compõe o número", () => {
    render(<StatCard title="A pagar" value="R$ 10,00" href="/contas/pagar" tone="danger" />);
    const link = screen.getByRole("link", { name: /A pagar/ });
    expect(link).toHaveAttribute("href", "/contas/pagar");
    expect(link).toHaveTextContent("R$ 10,00");
    expect(link.className).toContain("bg-danger-subtle");
  });
  it("sem href é só um bloco; carregando mostra esqueleto", () => {
    const { rerender } = render(<StatCard title="Ticket médio" value="—" subtitle="Faturamento ÷ vendas" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Faturamento ÷ vendas")).toBeInTheDocument();
    rerender(<StatCard title="Ticket médio" value="—" isLoading />);
    expect(screen.queryByText("Ticket médio")).not.toBeInTheDocument();
  });
});
