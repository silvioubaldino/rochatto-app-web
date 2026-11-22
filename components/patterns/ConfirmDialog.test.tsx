import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/errors";
import { ConfirmDialog, ConfirmProvider, useConfirm } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("409 aparece NO diálogo, que continua aberto (UX-P09)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn().mockRejectedValue(new ApiError(409, "Item em compra já pedida"));
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="Cancelar venda" tone="danger" confirmLabel="Cancelar venda" onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Cancelar venda" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Item em compra já pedida");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("fecha quando a ação dá certo", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="Receber compra" onConfirm={() => Promise.resolve()} />);
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("regra explicada ANTES: o motivo desabilita o botão", () => {
    render(<ConfirmDialog open onOpenChange={() => {}} title="Cancelar venda" disabledReason="Há Item em compra pedida." onConfirm={() => {}} />);
    expect(screen.getByRole("note")).toHaveTextContent("Há Item em compra pedida.");
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });
});

function Ask({ onResult }: { onResult: (ok: boolean) => void }) {
  const confirm = useConfirm();
  const [, force] = useState(0);
  return (
    <button
      onClick={async () => {
        onResult(await confirm({ title: "Fechar venda", confirmLabel: "Fechar venda" }));
        force((n) => n + 1);
      }}
    >
      perguntar
    </button>
  );
}

describe("useConfirm (substitui window.confirm)", () => {
  it("resolve true ao confirmar e false ao voltar", async () => {
    const user = userEvent.setup();
    const results: boolean[] = [];
    render(
      <ConfirmProvider>
        <Ask onResult={(ok) => results.push(ok)} />
      </ConfirmProvider>,
    );

    await user.click(screen.getByText("perguntar"));
    await user.click(await screen.findByRole("button", { name: "Fechar venda" }));
    await waitFor(() => expect(results).toEqual([true]));

    await user.click(screen.getByText("perguntar"));
    await user.click(await screen.findByRole("button", { name: "Voltar" }));
    await waitFor(() => expect(results).toEqual([true, false]));
  });
});
