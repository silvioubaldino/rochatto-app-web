import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { clearPreviewRegistry, registerPreview } from "@/components/entity/EntitySheet";
import { CommandPalette, useCommandPaletteShortcut } from "./CommandPalette";

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace, back: vi.fn() }),
  usePathname: () => "/vendas",
  useSearchParams: () => new URLSearchParams(""),
}));

function Harness({ startOpen = true }: { startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  useCommandPaletteShortcut(() => setOpen(true));
  return <CommandPalette open={open} onOpenChange={setOpen} />;
}

function renderPalette(startOpen = true) {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <Harness startOpen={startOpen} />
    </SWRConfig>,
  );
}

beforeEach(() => {
  nav.push.mockReset();
  registerPreview<{ n: number }>("quote", {
    title: () => "Orçamento",
    useData: () => ({ data: { n: 1 }, isLoading: false }),
    Body: () => null,
  });
});
afterEach(() => clearPreviewRegistry());

describe("CommandPalette (UX-P01)", () => {
  it("sem texto lista as ações", () => {
    renderPalette();
    expect(screen.getByRole("option", { name: /Novo orçamento/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Venda rápida/ })).toBeInTheDocument();
  });

  it('"154" acha o Orçamento e a Venda nº 154, com contexto', async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.type(screen.getByRole("combobox", { name: /Buscar/ }), "154");
    const quote = await screen.findByRole("option", { name: /Orçamento nº 154 · Alejandra Souza/ });
    expect(quote).toHaveTextContent("Bonito/MS");
    expect(quote).toHaveTextContent("Aberto");
    expect(screen.getByRole("option", { name: /Venda nº 154/ })).toBeInTheDocument();
  });

  it("Enter abre a página do primeiro resultado", async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.type(screen.getByRole("combobox", { name: /Buscar/ }), "154");
    await screen.findByRole("option", { name: /Orçamento nº 154/ });
    await user.keyboard("{Enter}");
    expect(nav.push).toHaveBeenCalledWith("/orcamentos/q154");
  });

  it("→ abre a prévia em vez da página", async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.type(screen.getByRole("combobox", { name: /Buscar/ }), "154");
    await screen.findByRole("option", { name: /Orçamento nº 154/ });
    await user.keyboard("{ArrowRight}");
    expect(nav.push).toHaveBeenCalledWith("/vendas?peek=quote%3Aq154", { scroll: false });
  });

  it("o botão de prévia serve ao toque", async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.type(screen.getByRole("combobox", { name: /Buscar/ }), "154");
    await user.click(await screen.findByRole("button", { name: /Prévia: Orçamento nº 154/ }));
    expect(nav.push).toHaveBeenCalledWith("/vendas?peek=quote%3Aq154", { scroll: false });
  });

  it("Ctrl+K abre de qualquer tela", async () => {
    const user = userEvent.setup();
    renderPalette(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.keyboard("{Control>}k{/Control}");
    expect(await screen.findByRole("dialog", { name: "Buscar" })).toBeInTheDocument();
  });
});
