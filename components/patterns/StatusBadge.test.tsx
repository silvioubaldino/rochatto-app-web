import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("mostra o rótulo em português e o tom, nunca o código do enum", () => {
    render(<StatusBadge kind="quote" value="WON" />);
    const badge = screen.getByText("Ganho");
    expect(badge).toHaveAttribute("data-tone", "success");
    expect(badge).toHaveClass("bg-success-subtle", "text-success");
    expect(screen.queryByText("WON")).not.toBeInTheDocument();
  });

  it("Sale só de serviço lê A executar", () => {
    render(<StatusBadge kind="saleDelivery" value="TO_DELIVER" serviceOnly />);
    expect(screen.getByText("A executar")).toBeInTheDocument();
  });

  it("vencido força o tom danger", () => {
    render(<StatusBadge kind="obligation" value="OPEN" overdue />);
    expect(screen.getByText("Aberta")).toHaveAttribute("data-tone", "danger");
  });

  it("selo livre por tom", () => {
    render(<StatusBadge tone="info">Venda rápida</StatusBadge>);
    expect(screen.getByText("Venda rápida")).toHaveClass("bg-info-subtle");
  });

  it("valor desconhecido vira traço neutro", () => {
    render(<StatusBadge kind="purchase" value="???" />);
    expect(screen.getByText("—")).toHaveAttribute("data-tone", "neutral");
  });
});
