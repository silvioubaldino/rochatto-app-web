import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { API, payables } from "@/tests/msw/handlers";
import { SettleFlowProvider, registerSettleFlow } from "@/components/entity/settle-flow";
import { ConfirmProvider } from "@/components/patterns/ConfirmDialog";
import { SettleFlow } from "./SettleFlow";
import { ObligationsPage } from "./ObligationsPage";

const nav = vi.hoisted(() => ({ search: "", replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: nav.replace, back: vi.fn() }),
  usePathname: () => "/contas/pagar",
  useSearchParams: () => new URLSearchParams(nav.search),
}));

registerSettleFlow(SettleFlow);

function renderPage() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <ConfirmProvider>
        <SettleFlowProvider>
          <ObligationsPage direction="PAYABLE" />
        </SettleFlowProvider>
      </ConfirmProvider>
    </SWRConfig>,
  );
}

beforeEach(() => {
  nav.search = "";
  nav.replace.mockReset();
});

describe("A pagar (T14)", () => {
  it("lista as contas com o vencido em destaque e os totais da api", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "A pagar" })).toBeInTheDocument();
    expect(await screen.findByText(/Em aberto R\$\s1\.580,50/)).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(payables.length + 1);
  });

  it("os chips de vencimento vão para a URL e para a consulta (Vencidas = overdue)", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Vencidas" }));
    expect(nav.replace).toHaveBeenCalledWith("/contas/pagar?quando=vencidas", { scroll: false });

    const asked: URLSearchParams[] = [];
    server.use(
      http.get(`${API}/obligations`, ({ request }) => {
        asked.push(new URL(request.url).searchParams);
        return HttpResponse.json({ items: [], totals: { amount: 0, settled: 0, open: 0 }, total: 0, offset: 0, has_more: false });
      }),
    );
    nav.search = "quando=vencidas";
    renderPage();
    await screen.findByText("Nada a pagar com esses filtros.");
    expect(asked.at(-1)?.get("overdue")).toBe("true");
    expect(asked.at(-1)?.get("direction")).toBe("PAYABLE");
  });

  it("selecionar duas contas leva ao fluxo de pagamento com as duas", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText("Compra nº 12");
    const action = screen.getByRole("button", { name: /Pagar selecionadas/ });
    expect(action).toBeDisabled();
    const boxes = screen.getAllByRole("checkbox", { name: /Selecionar conta de Matheus RJ/ });
    await user.click(boxes[0]);
    await user.click(boxes[1]);
    await user.click(screen.getByRole("button", { name: /Pagar 2 contas · R\$\s1\.500,50/ }));
    const dialog = await screen.findByRole("dialog", { name: "Pagar 2 contas" });
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(2);
  });

  it("agrupar por credor soma o aberto e oferece Pagar tudo deste credor", async () => {
    const user = userEvent.setup();
    nav.search = "agrupar=credor";
    renderPage();
    const group = await screen.findByRole("button", { name: /Matheus RJ · 2/ });
    expect(group).toHaveTextContent(/1\.500,50 em aberto · 1 vencida/);
    await user.click(screen.getAllByRole("button", { name: "Pagar tudo deste credor" })[0]);
    expect(await screen.findByRole("dialog", { name: "Pagar 2 contas" })).toBeInTheDocument();
  });
});
