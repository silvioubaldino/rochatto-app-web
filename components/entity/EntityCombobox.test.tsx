import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState, type ReactNode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { API } from "@/tests/msw/handlers";
import { CustomerForm } from "@/features/customers/components/CustomerForm";
import { EntityCombobox } from "./EntityCombobox";
import { QuickCreateProvider, clearQuickCreateRegistry, registerQuickCreate } from "./quick-create";
import type { EntityOption } from "./entity-queries";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/orcamentos/novo",
  useSearchParams: () => new URLSearchParams(),
}));

function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <QuickCreateProvider>{children}</QuickCreateProvider>
    </SWRConfig>
  );
}

function Harness({ onChange }: { onChange: (id: string, option: EntityOption<"customer"> | null) => void }) {
  const [value, setValue] = useState("");
  return (
    <EntityCombobox
      kind="customer"
      id="customer"
      aria-label="Cliente"
      value={value}
      onChange={(id, option) => {
        setValue(id);
        onChange(id, option);
      }}
    />
  );
}

beforeEach(() => {
  window.localStorage.clear();
  registerQuickCreate("customer", { title: "Novo cliente", Form: CustomerForm });
});
afterEach(() => clearQuickCreateRegistry());

describe("EntityCombobox", () => {
  it("busca com debounce, mostra contexto e seleciona por clique", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />, { wrapper: Providers });

    const input = screen.getByRole("combobox", { name: "Cliente" });
    await user.click(input);
    await user.type(input, "Alej");

    const option = await screen.findByRole("option", { name: /Alejandra Souza/ });
    expect(option).toHaveTextContent("Bonito/MS");
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith("c1", expect.objectContaining({ id: "c1", label: "Alejandra Souza" }));
    expect(screen.getByRole("combobox", { name: "Cliente" })).toHaveValue("Alejandra Souza");
  });

  it("navega e escolhe pelo teclado (↓ Enter), Esc fecha", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />, { wrapper: Providers });

    const input = screen.getByRole("combobox", { name: "Cliente" });
    await user.click(input);
    await screen.findByRole("option", { name: /Alberto Lima/ });
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("c2", expect.anything());

    await user.click(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it('"＋ Criar" abre o cadastro pré-preenchido e SELECIONA o criado, sem perder o formulário de origem', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    let posted: { nome?: string } | null = null;
    server.use(
      http.post(`${API}/clientes`, async ({ request }) => {
        posted = (await request.json()) as { nome: string };
        return HttpResponse.json({ id: "c-new", nome: posted.nome, created_at: "2026-11-22T00:00:00Z" }, { status: 201 });
      }),
    );
    render(
      <Providers>
        <label>
          Observação digitada
          <input defaultValue="não pode se perder" />
        </label>
        <Harness onChange={onChange} />
      </Providers>,
    );

    const input = screen.getByRole("combobox", { name: "Cliente" });
    await user.click(input);
    await user.type(input, "Fulano de Tal");

    await user.click(await screen.findByRole("option", { name: '＋ Criar cliente "Fulano de Tal"' }));

    const dialog = await screen.findByRole("dialog", { name: "Novo cliente" });
    expect(within(dialog).getByLabelText(/Nome/)).toHaveValue("Fulano de Tal");

    await user.click(within(dialog).getByRole("button", { name: "Criar" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("c-new", expect.objectContaining({ label: "Fulano de Tal" })));
    expect(posted).toMatchObject({ nome: "Fulano de Tal" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Novo cliente" })).not.toBeInTheDocument());
    expect(screen.getByRole("combobox", { name: "Cliente" })).toHaveValue("Fulano de Tal");
    expect(screen.getByLabelText("Observação digitada")).toHaveValue("não pode se perder");
  });

  it("não oferece criar quando o tipo não tem formulário registrado ou allowCreate=false", async () => {
    clearQuickCreateRegistry();
    const user = userEvent.setup();
    render(<Harness onChange={vi.fn()} />, { wrapper: Providers });
    const input = screen.getByRole("combobox", { name: "Cliente" });
    await user.click(input);
    await user.type(input, "Zzz");
    await screen.findByText("Nada encontrado.");
    expect(screen.queryByText(/Criar cliente/)).not.toBeInTheDocument();
  });

  it("mostra o NOME do id que veio da URL (F18) e limpa", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EntityCombobox kind="customer" id="c" aria-label="Cliente" value="c2" onChange={onChange} />, { wrapper: Providers });

    await waitFor(() => expect(screen.getByRole("combobox", { name: "Cliente" })).toHaveValue("Alberto Lima"));
    await user.click(screen.getByRole("button", { name: "Limpar seleção" }));
    expect(onChange).toHaveBeenCalledWith("", null);
  });

  it("filter e prefer: só passam os aceitos e os preferidos vêm primeiro", async () => {
    server.use(
      http.get(`${API}/fornecedores`, () =>
        HttpResponse.json([
          { id: "s1", nome: "Matheus Transportes", kind: "TRANSPORT", created_at: "" },
          { id: "s2", nome: "Matheus RJ", kind: "STONE", created_at: "" },
          { id: "s3", nome: "Órgão do ICMS", kind: "TAX_AUTHORITY", created_at: "" },
        ]),
      ),
    );
    const user = userEvent.setup();
    render(
      <EntityCombobox
        kind="supplier"
        aria-label="Fornecedor"
        value=""
        onChange={vi.fn()}
        filter={(s) => s.kind !== "TAX_AUTHORITY"}
        prefer={(s) => s.kind === "STONE"}
      />,
      { wrapper: Providers },
    );
    await user.click(screen.getByRole("combobox", { name: "Fornecedor" }));
    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining("Matheus RJ"),
      expect.stringContaining("Matheus Transportes"),
    ]);
  });
});
