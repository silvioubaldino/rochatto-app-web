import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateField, MoneyField, QuantityField } from "./fields";
import { Select } from "./Select";

function Money({ onChange }: { onChange: (v: number) => void }) {
  const [v, setV] = useState(0);
  return (
    <MoneyField
      aria-label="Valor"
      id="v"
      value={v}
      onChange={(n) => {
        setV(n);
        onChange(n);
      }}
    />
  );
}

describe("MoneyField", () => {
  it("usa teclado decimal e lê vírgula ao sair do campo", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Money onChange={onChange} />);
    const input = document.getElementById("v") as HTMLInputElement;
    expect(input).toHaveAttribute("inputmode", "decimal");
    expect(input).toHaveAttribute("enterkeyhint", "next");

    await user.click(input);
    await user.keyboard("1234,5");
    await user.tab();

    expect(onChange).toHaveBeenLastCalledWith(1234.5);
    expect(input.value.replace(/\s/g, " ")).toBe("R$ 1.234,50");
  });

  it("não aceita letras", async () => {
    const user = userEvent.setup();
    render(<Money onChange={() => {}} />);
    const input = document.getElementById("v") as HTMLInputElement;
    await user.click(input);
    await user.keyboard("a1b2");
    expect(input.value).toBe("12");
  });
});

describe("QuantityField", () => {
  it("mostra a unidade ao lado", () => {
    render(<QuantityField id="q" value={18} onChange={() => {}} unit="m²" />);
    expect(screen.getByText("m²")).toBeInTheDocument();
    expect(document.getElementById("q")).toHaveValue("18");
  });
});

describe("DateField", () => {
  it("atalhos Hoje / +7 / +30 preenchem a data", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateField id="d" value="" onChange={onChange} today="2026-11-22" />);
    await user.click(screen.getByRole("button", { name: "+7 dias" }));
    expect(onChange).toHaveBeenCalledWith("2026-11-29");
    await user.click(screen.getByRole("button", { name: "+30 dias" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-12-22");
    await user.click(screen.getByRole("button", { name: "Hoje" }));
    expect(onChange).toHaveBeenLastCalledWith("2026-11-22");
  });

  it("pode desligar os atalhos", () => {
    render(<DateField id="d" value="" onChange={() => {}} shortcuts={false} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("Select", () => {
  it("mostra o rótulo (não o valor) e troca a seleção pelo teclado/clique", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        aria-label="Origem"
        value="REFERRAL"
        onChange={onChange}
        options={[
          { value: "REFERRAL", label: "Indicação" },
          { value: "INSTAGRAM", label: "Instagram" },
        ]}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "Origem" });
    expect(trigger).toHaveTextContent("Indicação");
    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "Instagram" }));
    expect(onChange).toHaveBeenCalledWith("INSTAGRAM");
  });
});
