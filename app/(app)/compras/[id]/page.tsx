"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Undo2,
  Wallet,
} from "lucide-react";
import { api, APIError } from "@/lib/api";
import { isPurchaseRelatedKey, usePurchase } from "@/hooks/usePurchases";
import {
  PURCHASE_KIND_LABELS,
  formatData,
  formatMoeda,
  formatQuantidade,
} from "@/lib/formatters";
import type { PurchaseItem, PurchaseSaleItem, PurchaseStatus } from "@/lib/types";
import { PurchaseStatusBadge, SupplierPaymentBadge } from "@/components/status-badges";
import { PurchaseHeaderModal } from "@/components/purchases/PurchaseHeaderModal";
import { PurchaseItemModal } from "@/components/purchases/PurchaseItemModal";
import { SupplierPaymentModal } from "@/components/purchases/SupplierPaymentModal";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Transition {
  to: PurchaseStatus;
  label: string;
  icon: React.ReactNode;
  variant: "default" | "outline";
  confirm: string;
}

/** Transições permitidas (AYD-002): OPEN→ORDERED, ORDERED→OPEN, ORDERED→RECEIVED. */
function transitionsFor(status: PurchaseStatus, isReplenishment: boolean): Transition[] {
  if (status === "OPEN") {
    return [
      {
        to: "ORDERED",
        label: "Marcar como pedida",
        icon: <Send className="h-3.5 w-3.5" />,
        variant: "default",
        confirm: "A compra passa para \"Pedida\": os itens deixam de poder ser incluídos ou removidos.",
      },
    ];
  }
  if (status === "ORDERED") {
    return [
      {
        to: "RECEIVED",
        label: "Marcar como recebida",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        variant: "default",
        confirm: isReplenishment
          ? "A compra passa para \"Recebida\" (definitivo) e as quantidades entram no saldo do estoque."
          : "A compra passa para \"Recebida\" (definitivo).",
      },
      {
        to: "OPEN",
        label: "Voltar para aberta",
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        variant: "outline",
        confirm: "A compra volta para \"Aberta\" e pode ter itens incluídos ou removidos.",
      },
    ];
  }
  return [];
}

export default function CompraDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const purchaseId = params.id as string;
  const { mutate } = useSWRConfig();
  const { purchase, isLoading, error, refresh } = usePurchase(purchaseId);

  const [headerOpen, setHeaderOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PurchaseItem | undefined>();
  const [deletingItem, setDeletingItem] = useState<PurchaseItem | null>(null);
  const [detachingSaleItem, setDetachingSaleItem] = useState<PurchaseSaleItem | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [undoPaymentOpen, setUndoPaymentOpen] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<Transition | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  /** Purchase muda saldo do Stock, fila "a comprar", Sales (purchase_id) e painel. */
  function refreshAll() {
    refresh();
    mutate(isPurchaseRelatedKey);
  }

  async function runTransition() {
    if (!pendingTransition) return;
    setBusy(true);
    try {
      await api.patch(`/purchases/${purchaseId}/status`, { status: pendingTransition.to });
      toast.success("Status da compra atualizado.");
      setPendingTransition(null);
      refreshAll();
    } catch (err) {
      // 422 (sem linhas ao pedir) e 409 (transição ilegal) trazem a mensagem da API.
      toast.error(err instanceof APIError ? err.message : "Erro ao atualizar status.");
    } finally {
      setBusy(false);
    }
  }

  async function undoPayment() {
    setBusy(true);
    try {
      await api.patch(`/purchases/${purchaseId}/payment`, {
        payment_status: "PENDING",
        paid_amount: null,
        paid_at: null,
      });
      toast.success("Pagamento desfeito.");
      setUndoPaymentOpen(false);
      refreshAll();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao desfazer pagamento.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDetach() {
    if (!detachingSaleItem) return;
    try {
      await api.delete(`/purchases/${purchaseId}/sale-items/${detachingSaleItem.id}`);
      toast.success("Item removido da compra — voltou para a fila \"a comprar\".");
      refreshAll();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao remover item.");
    } finally {
      setDetachingSaleItem(null);
    }
  }

  async function confirmDeleteItem() {
    if (!deletingItem) return;
    try {
      await api.delete(`/purchases/${purchaseId}/items/${deletingItem.id}`);
      toast.success("Linha removida.");
      refreshAll();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao remover linha.");
    } finally {
      setDeletingItem(null);
    }
  }

  async function confirmDelete() {
    try {
      await api.delete(`/purchases/${purchaseId}`);
      toast.success("Compra excluída. Os itens de venda voltaram para a fila.");
      mutate(isPurchaseRelatedKey);
      router.push("/compras");
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao excluir compra.");
    } finally {
      setDeleteOpen(false);
    }
  }

  if (error && !purchase) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/compras")}>
          <ArrowLeft className="h-4 w-4" />
          Compras
        </Button>
        <p className="text-sm text-destructive">
          {error instanceof APIError ? error.message : "Erro ao carregar a compra."}
        </p>
      </div>
    );
  }

  if (isLoading || !purchase) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const isOpen = purchase.status === "OPEN";
  const isReplenishment = purchase.kind === "STOCK_REPLENISHMENT";
  const transitions = transitionsFor(purchase.status, isReplenishment);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/compras")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Compra</h1>
        <span className="font-mono text-sm text-muted-foreground">#{purchase.id.slice(0, 8)}</span>
        <PurchaseStatusBadge status={purchase.status} />
        <SupplierPaymentBadge status={purchase.payment_status} />

        <div className="ml-auto flex flex-wrap gap-2">
          {transitions.map((t) => (
            <Button key={t.to} size="sm" variant={t.variant} onClick={() => setPendingTransition(t)}>
              {t.icon}
              {t.label}
            </Button>
          ))}
          {isOpen && (
            <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Dados da compra</h2>
            <Button variant="ghost" size="icon-xs" onClick={() => setHeaderOpen(true)} title="Editar">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Fornecedor</dt>
            <dd className="font-medium">{purchase.supplier_name}</dd>
            <dt className="text-muted-foreground">Tipo</dt>
            <dd>{PURCHASE_KIND_LABELS[purchase.kind]}</dd>
            <dt className="text-muted-foreground">Previsão</dt>
            <dd>{purchase.expected_date ? formatData(purchase.expected_date) : "—"}</dd>
            <dt className="text-muted-foreground">Pedida em</dt>
            <dd>{purchase.ordered_at ? formatData(purchase.ordered_at) : "—"}</dd>
            <dt className="text-muted-foreground">Recebida em</dt>
            <dd>{purchase.received_at ? formatData(purchase.received_at) : "—"}</dd>
            <dt className="text-muted-foreground">Observações</dt>
            <dd className="whitespace-pre-wrap">{purchase.notes || "—"}</dd>
          </dl>
        </Card>

        {/* Supplier payment — um por Purchase (RN-06) */}
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Pagamento ao fornecedor</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Custo total</dt>
            <dd className="font-semibold">{formatMoeda(purchase.total_cost)}</dd>
            <dt className="text-muted-foreground">Pago</dt>
            <dd className="text-green-600">
              {purchase.paid_amount !== null ? formatMoeda(purchase.paid_amount) : "—"}
              {purchase.paid_at && (
                <span className="text-muted-foreground"> em {formatData(purchase.paid_at)}</span>
              )}
            </dd>
            <dt className="text-muted-foreground">A pagar</dt>
            <dd className="font-semibold text-orange-600">{formatMoeda(purchase.to_pay)}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <SupplierPaymentBadge status={purchase.payment_status} />
            </dd>
          </dl>
          <div className="flex gap-2 pt-1">
            {purchase.payment_status === "PENDING" ? (
              <Button size="sm" onClick={() => setPaymentOpen(true)}>
                <Wallet className="h-3.5 w-3.5" />
                Registrar pagamento
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setUndoPaymentOpen(true)}>
                <Undo2 className="h-3.5 w-3.5" />
                Desfazer pagamento
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Linhas */}
      {isReplenishment ? (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Produtos para o estoque</h2>
            {isOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingItem(undefined);
                  setItemModalOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar produto
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Produto</th>
                  <th className="pb-2 pr-3 font-medium text-right">Qtd</th>
                  <th className="pb-2 pr-3 font-medium text-right">Custo unit.</th>
                  <th className="pb-2 pr-3 font-medium text-right">Total</th>
                  {isOpen && <th className="pb-2 font-medium w-16">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {purchase.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      Nenhum produto. Adicione ao menos um antes de marcar como pedida.
                    </td>
                  </tr>
                ) : (
                  purchase.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">{item.product_name}</td>
                      <td className="py-2 pr-3 text-right">{formatQuantidade(item.quantity)}</td>
                      <td className="py-2 pr-3 text-right">{formatMoeda(item.unit_cost)}</td>
                      <td className="py-2 pr-3 text-right">{formatMoeda(item.quantity * item.unit_cost)}</td>
                      {isOpen && (
                        <td className="py-2">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              title="Editar"
                              onClick={() => {
                                setEditingItem(item);
                                setItemModalOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-xs" title="Remover" onClick={() => setDeletingItem(item)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Itens de venda</h2>
            {isOpen && (
              <Button variant="outline" size="sm" onClick={() => router.push("/compras?tab=a-comprar")}>
                <Plus className="h-3.5 w-3.5" />
                Adicionar da fila
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Venda</th>
                  <th className="pb-2 pr-3 font-medium">Cliente</th>
                  <th className="pb-2 pr-3 font-medium">Produto</th>
                  <th className="pb-2 pr-3 font-medium text-right">Qtd</th>
                  <th className="pb-2 pr-3 font-medium text-right">Custo unit.</th>
                  <th className="pb-2 pr-3 font-medium text-right">Total</th>
                  {isOpen && <th className="pb-2 font-medium w-12">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {purchase.sale_items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      Nenhum item. Adicione itens da fila &quot;a comprar&quot; antes de marcar como pedida.
                    </td>
                  </tr>
                ) : (
                  purchase.sale_items.map((si) => (
                    <tr key={si.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <Link href={`/vendas/${si.sale_id}`} className="text-primary hover:underline">
                          #{si.sale_id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">{si.customer_name}</td>
                      <td className="py-2 pr-3">{si.produto_nome}</td>
                      <td className="py-2 pr-3 text-right">{formatQuantidade(si.quantidade)}</td>
                      <td className="py-2 pr-3 text-right">{formatMoeda(si.custo_unit)}</td>
                      <td className="py-2 pr-3 text-right">{formatMoeda(si.quantidade * si.custo_unit)}</td>
                      {isOpen && (
                        <td className="py-2">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            title="Remover da compra"
                            onClick={() => setDetachingSaleItem(si)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!isOpen && (
        <p className="text-xs text-muted-foreground">
          {purchase.status === "RECEIVED"
            ? "Compra recebida é definitiva. Diferenças de quantidade se corrigem com um ajuste de estoque."
            : "Para incluir ou remover itens, volte a compra para \"Aberta\"."}
        </p>
      )}

      {/* Modais */}
      <PurchaseHeaderModal
        open={headerOpen}
        onClose={() => setHeaderOpen(false)}
        purchase={purchase}
        onSuccess={refreshAll}
      />
      <PurchaseItemModal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        purchaseId={purchaseId}
        item={editingItem}
        onSuccess={refreshAll}
      />
      <SupplierPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        purchaseId={purchaseId}
        totalCost={purchase.total_cost}
        onSuccess={refreshAll}
      />

      <AlertDialog open={!!pendingTransition} onOpenChange={(o) => !o && !busy && setPendingTransition(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingTransition?.label}</AlertDialogTitle>
            <AlertDialogDescription>{pendingTransition?.confirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Voltar</AlertDialogCancel>
            <Button onClick={runTransition} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={undoPaymentOpen} onOpenChange={(o) => !o && !busy && setUndoPaymentOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              O pagamento volta para &quot;Pendente&quot; e o valor e a data pagos são apagados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Voltar</AlertDialogCancel>
            <Button variant="destructive" onClick={undoPayment} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Desfazer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteConfirmDialog
        open={!!detachingSaleItem}
        onClose={() => setDetachingSaleItem(null)}
        onConfirm={confirmDetach}
        title="Remover item da compra"
        description={`"${detachingSaleItem?.produto_nome ?? "Item"}" volta para a fila "a comprar".`}
      />
      <DeleteConfirmDialog
        open={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={confirmDeleteItem}
        title="Remover linha"
        description={`Remover "${deletingItem?.product_name ?? "esta linha"}" da compra?`}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir compra"
        description={'A compra é excluída e os itens de venda voltam para a fila "a comprar".'}
      />
    </div>
  );
}
