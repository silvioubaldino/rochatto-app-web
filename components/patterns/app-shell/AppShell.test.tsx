import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { AppShell } from "./AppShell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/vendas/abc",
  useSearchParams: () => new URLSearchParams(),
}));

const user = { displayName: "Dono", photoURL: null, email: "dono@exemplo.com" };

function renderShell(props: Partial<React.ComponentProps<typeof AppShell>> = {}) {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <AppShell user={user} onSignOut={() => {}} {...props}>
        <p>conteúdo da página</p>
      </AppShell>
    </SWRConfig>,
  );
}

describe("AppShell", () => {
  it("o shell aparece ANTES da autenticação e o conteúdo vira esqueleto (sem spinner de página)", () => {
    renderShell({ user: null });
    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument();
    expect(screen.getByLabelText("Menu principal")).toBeInTheDocument();
    expect(screen.queryByText("conteúdo da página")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Carregando")).toHaveAttribute("aria-busy", "true");
  });

  it("autenticado: renderiza a página", () => {
    renderShell();
    expect(screen.getByText("conteúdo da página")).toBeInTheDocument();
  });

  it("barra inferior: Hoje · Orçamentos · Novo · Vendas · Mais, com a rota atual marcada", () => {
    renderShell();
    const bar = screen.getByRole("navigation", { name: "Navegação principal" });
    const items = Array.from(bar.querySelectorAll("a, button"));
    expect(items.map((i) => i.textContent?.trim() || i.getAttribute("aria-label"))).toEqual([
      "Hoje",
      "Orçamentos",
      "Novo",
      "Vendas",
      "Mais",
    ]);
    expect(within(bar).getByRole("link", { name: "Vendas" })).toHaveAttribute("aria-current", "page");
    expect(within(bar).getByRole("link", { name: "Hoje" })).toHaveAttribute("href", "/hoje");
  });

  it("badge do Hoje mostra os vencidos", () => {
    renderShell({ badges: { today: 3 } });
    const bar = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(within(bar).getByText("3")).toBeInTheDocument();
  });

  it("Mais abre o menu agrupado com Integrações e Sair", async () => {
    const onSignOut = vi.fn();
    const u = userEvent.setup();
    renderShell({ onSignOut });
    await u.click(screen.getByRole("button", { name: "Mais" }));
    const dialog = await screen.findByRole("dialog", { name: "Menu" });
    for (const label of ["Comercial", "Operação", "Cadastros"]) {
      expect(within(dialog).getByText(label)).toBeInTheDocument();
    }
    expect(within(dialog).getByRole("link", { name: "Compras" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Integrações" })).toBeInTheDocument();
    await u.click(within(dialog).getByRole("button", { name: /Sair/ }));
    expect(onSignOut).toHaveBeenCalled();
  });
});
