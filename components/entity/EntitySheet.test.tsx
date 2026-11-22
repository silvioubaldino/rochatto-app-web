import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { clearPreviewRegistry, EntitySheetHost, registerPreview, usePeek } from "./EntitySheet";
import { EntityLink } from "./EntityLink";

const nav = vi.hoisted(() => ({
  search: "",
  pathname: "/vendas",
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace, back: nav.back }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

function Opener() {
  const { open } = usePeek();
  return <button onClick={() => open("customer", "c1")}>abrir</button>;
}

beforeEach(() => {
  nav.search = "";
  nav.push.mockReset();
  nav.replace.mockReset();
  nav.back.mockReset();
  registerPreview<{ nome: string }>("customer", {
    title: (c) => c.nome,
    useData: () => ({ data: { nome: "Alejandra Souza" }, isLoading: false }),
    Body: ({ data }) => <p>Preview de {data.nome}</p>,
  });
});
afterEach(() => clearPreviewRegistry());

describe("EntitySheet (?peek=type:id)", () => {
  it("abrir empilha a URL com o peek, preservando os filtros", async () => {
    const user = userEvent.setup();
    nav.search = "delivery_status=TO_DELIVER";
    render(<Opener />);
    await user.click(screen.getByText("abrir"));
    expect(nav.push).toHaveBeenCalledWith("/vendas?delivery_status=TO_DELIVER&peek=customer%3Ac1", { scroll: false });
  });

  it("com ?peek= na URL mostra a prévia da entidade, com título e Abrir página", () => {
    nav.search = "peek=customer%3Ac1";
    render(<EntitySheetHost />);
    const dialog = screen.getByRole("dialog", { name: "Alejandra Souza" });
    expect(dialog).toHaveTextContent("Preview de Alejandra Souza");
    expect(screen.getByRole("link", { name: "Abrir página" })).toHaveAttribute("href", "/clientes/c1");
  });

  it("sem prévia registrada para o tipo (ou peek inválido) não abre nada", () => {
    nav.search = "peek=sale%3Aabc";
    render(<EntitySheetHost />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    nav.search = "peek=lixo";
    render(<EntitySheetHost />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("fechar volta no histórico quando o app abriu a prévia (voltar fecha o painel)", async () => {
    const user = userEvent.setup();
    nav.search = "";
    const { rerender } = render(
      <>
        <Opener />
        <EntitySheetHost />
      </>,
    );
    await user.click(screen.getByText("abrir"));
    nav.search = "peek=customer%3Ac1";
    rerender(
      <>
        <Opener />
        <EntitySheetHost />
      </>,
    );
    await user.click(screen.getAllByRole("button", { name: "Fechar prévia" })[1]);
    expect(nav.back).toHaveBeenCalled();
  });

  it("EntityLink: clique simples abre a prévia; Ctrl+clique segue o href da página", async () => {
    const user = userEvent.setup();
    render(
      <EntityLink type="customer" id="c1" mode="peek">
        Alejandra
      </EntityLink>,
    );
    const link = screen.getByRole("link", { name: "Alejandra" });
    expect(link).toHaveAttribute("href", "/clientes/c1");
    await user.click(link);
    expect(nav.push).toHaveBeenCalledWith(expect.stringContaining("peek=customer%3Ac1"), { scroll: false });

    nav.push.mockClear();
    await user.keyboard("{Control>}");
    await user.click(link);
    await user.keyboard("{/Control}");
    expect(nav.push).not.toHaveBeenCalled();
  });
});
