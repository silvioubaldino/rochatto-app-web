"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQuote } from "@/hooks/useQuote";
import { useProdutos } from "@/hooks/useProdutos";
import { useFornecedores } from "@/hooks/useFornecedores";
import { api, APIError } from "@/lib/api";
import { formatMoeda, formatData, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from "@/lib/formatters";
import type { QuoteItem } from "@/lib/types";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Save,
  X,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function OrcamentoDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;
  const { quote, isLoading, refresh } = useQuote(quoteId);
  const { produtos } = useProdutos();
  const { fornecedores } = useFornecedores();

  const isOpen = quote?.status === "OPEN";

  // Inline item editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemData, setEditItemData] = useState<Partial<QuoteItem>>({});

  // Add item
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    product_name: "",
    product_id: "",
    supplier_name: "",
    supplier_id: "",
    quantity: 0,
    unit_price: 0,
    unit_cost: 0,
  });
  const [newItemProdutoSearch, setNewItemProdutoSearch] = useState("");
  const [showNewProdutoDropdown, setShowNewProdutoDropdown] = useState(false);
  const [newItemFornecedorSearch, setNewItemFornecedorSearch] = useState("");
  const [showNewFornecedorDropdown, setShowNewFornecedorDropdown] = useState(false);
  const [savingNewItem, setSavingNewItem] = useState(false);

  // Delete item
  const [deleteItemDialog, setDeleteItemDialog] = useState(false);
  const [deletingItem, setDeletingItem] = useState<QuoteItem | null>(null);

  // Edit general (referrer/notes)
  const [editGeneralOpen, setEditGeneralOpen] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [savingGeneral, setSavingGeneral] = useState(false);

  // Mark as lost
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [savingLost, setSavingLost] = useState(false);

  // Convert
  const [converting, setConverting] = useState(false);

  // --- Item edit ---
  function startEditItem(item: QuoteItem) {
    setEditingItemId(item.id);
    setEditItemData({
      unit_price: item.unit_price,
      unit_cost: item.unit_cost,
      quantity: item.quantity,
      supplier_name: item.supplier_name,
      product_name: item.product_name,
    });
  }

  function cancelEditItem() {
    setEditingItemId(null);
    setEditItemData({});
  }

  async function saveEditItem(itemId: string) {
    try {
      await api.put(`/quotes/${quoteId}/items/${itemId}`, editItemData);
      toast.success("Item atualizado.");
      cancelEditItem();
      refresh();
    } catch (err) {
      const message = err instanceof APIError ? err.message : "Erro ao atualizar item.";
      toast.error(message);
    }
  }

  function handleDeleteItemClick(item: QuoteItem) {
    setDeletingItem(item);
    setDeleteItemDialog(true);
  }

  const handleDeleteItemConfirm = useCallback(async () => {
    if (!deletingItem) return;
    try {
      await api.delete(`/quotes/${quoteId}/items/${deletingItem.id}`);
      toast.success("Item removido.");
      refresh();
    } catch (err) {
      const message = err instanceof APIError ? err.message : "Erro ao remover item.";
      toast.error(message);
    } finally {
      setDeleteItemDialog(false);
      setDeletingItem(null);
    }
  }, [deletingItem, quoteId, refresh]);

  async function handleSaveNewItem() {
    if (!newItem.product_name) {
      toast.error("Informe o produto.");
      return;
    }
    setSavingNewItem(true);
    try {
      await api.post(`/quotes/${quoteId}/items`, newItem);
      toast.success("Item adicionado.");
      setAddingItem(false);
      setNewItem({
        product_name: "",
        product_id: "",
        supplier_name: "",
        supplier_id: "",
        quantity: 0,
        unit_price: 0,
        unit_cost: 0,
      });
      refresh();
    } catch (err) {
      const message = err instanceof APIError ? err.message : "Erro ao adicionar item.";
      toast.error(message);
    } finally {
      setSavingNewItem(false);
    }
  }

  async function handleSaveGeneral() {
    setSavingGeneral(true);
    try {
      await api.put(`/quotes/${quoteId}`, { notes: editNotes });
      toast.success("Observações atualizadas.");
      setEditGeneralOpen(false);
      refresh();
    } catch (err) {
      const message = err instanceof APIError ? err.message : "Erro ao salvar.";
      toast.error(message);
    } finally {
      setSavingGeneral(false);
    }
  }

  async function handleMarkAsLost() {
    setSavingLost(true);
    try {
      await api.patch(`/quotes/${quoteId}/status`, {
        status: "LOST",
        lost_reason: lostReason || undefined,
      });
      toast.success("Orçamento marcado como perdido.");
      setLostDialogOpen(false);
      setLostReason("");
      refresh();
    } catch (err) {
      const message = err instanceof APIError ? err.message : "Erro ao marcar como perdido.";
      toast.error(message);
    } finally {
      setSavingLost(false);
    }
  }

  async function handleReopen() {
    try {
      await api.patch(`/quotes/${quoteId}/status`, { status: "OPEN" });
      toast.success("Orçamento reaberto.");
      refresh();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao reabrir orçamento.");
    }
  }

  async function handleConvert() {
    if (!quote) return;
    const confirmed = window.confirm("Confirma a conversão deste orçamento em venda?");
    if (!confirmed) return;

    setConverting(true);
    try {
      const result = await api.post<{ sale_id: string; quote_id: string }>(
        `/quotes/${quoteId}/convert`,
        {},
      );
      toast.success("Orçamento convertido em venda!");
      router.push(`/vendas/${result.sale_id}`);
    } catch (err) {
      const message = err instanceof APIError ? err.message : "Erro ao converter orçamento.";
      toast.error(message);
    } finally {
      setConverting(false);
    }
  }

  if (isLoading || !quote) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/orcamentos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Orçamento</h1>
        <span className="text-sm text-muted-foreground font-mono">
          #{quote.id.slice(0, 8)}
        </span>

        <span
          className={cn(
            "ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            QUOTE_STATUS_COLORS[quote.status],
          )}
        >
          {QUOTE_STATUS_LABELS[quote.status]}
        </span>
      </div>

      {isOpen && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleConvert} disabled={converting}>
            {converting && <Loader2 className="h-4 w-4 animate-spin" />}
            <CheckCircle2 className="h-4 w-4" />
            Converter em Sale
          </Button>
          <Button variant="outline" onClick={() => setLostDialogOpen(true)}>
            Marcar como perdido
          </Button>
        </div>
      )}
      {quote.status === "LOST" && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleReopen}>
            Reabrir Orçamento
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* General info */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">
              Informações Gerais
            </h2>
            {isOpen && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setEditNotes(quote.notes || "");
                  setEditGeneralOpen(true);
                }}
                title="Editar observações"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Cliente</dt>
            <dd className="font-medium">{quote.customer_name}</dd>
            <dt className="text-muted-foreground">Data</dt>
            <dd>{formatData(quote.quote_date)}</dd>
            <dt className="text-muted-foreground">Indicação</dt>
            <dd>{quote.referrer_name || "—"}</dd>
            {quote.status === "LOST" && (
              <>
                <dt className="text-muted-foreground">Motivo da perda</dt>
                <dd>{quote.lost_reason || "—"}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Observações</dt>
            <dd>{quote.notes || "—"}</dd>
          </dl>
        </Card>

        {/* Financial summary */}
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">
            Resumo
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Total do Orçamento</dt>
            <dd className="font-semibold">{formatMoeda(quote.total_quote)}</dd>
          </dl>
        </Card>
      </div>

      {/* Itens */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">
            Itens do Orçamento
          </h2>
          {isOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingItem(true)}
              disabled={addingItem}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Produto</th>
                <th className="pb-2 pr-4 font-medium">Fornecedor</th>
                <th className="pb-2 pr-4 font-medium text-right">Qtd</th>
                <th className="pb-2 pr-4 font-medium text-right">Preço Unit.</th>
                <th className="pb-2 pr-4 font-medium text-right">Total</th>
                {isOpen && <th className="pb-2 font-medium w-20">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {(quote.items || []).map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">{item.product_name}</td>
                  <td className="py-2 pr-4">{item.supplier_name || "—"}</td>
                  {editingItemId === item.id ? (
                    <>
                      <td className="py-2 pr-4 text-right">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={editItemData.quantity ?? ""}
                          onChange={(e) =>
                            setEditItemData((prev) => ({
                              ...prev,
                              quantity: parseFloat(e.target.value.replace(",", ".")) || 0,
                            }))
                          }
                          className="h-7 w-16 text-right text-sm"
                        />
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <MoneyInput
                          value={editItemData.unit_price ?? 0}
                          onChange={(v) =>
                            setEditItemData((prev) => ({ ...prev, unit_price: v }))
                          }
                          className="h-7 w-24 text-right text-sm"
                        />
                      </td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">—</td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => saveEditItem(item.id)}
                            title="Salvar"
                          >
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={cancelEditItem}
                            title="Cancelar"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 pr-4 text-right">{item.quantity}</td>
                      <td className="py-2 pr-4 text-right">{formatMoeda(item.unit_price)}</td>
                      <td className="py-2 pr-4 text-right">{formatMoeda(item.total_price)}</td>
                      {isOpen && (
                        <td className="py-2">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => startEditItem(item)}
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleDeleteItemClick(item)}
                              title="Remover"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}

              {addingItem && (
                <tr className="border-b bg-muted/20">
                  <td className="py-2 pr-4">
                    <div className="relative">
                      <Input
                        placeholder="Produto..."
                        value={newItemProdutoSearch || newItem.product_name}
                        onChange={(e) => {
                          setNewItemProdutoSearch(e.target.value);
                          setNewItem((prev) => ({
                            ...prev,
                            product_name: e.target.value,
                            product_id: "",
                          }));
                          setShowNewProdutoDropdown(true);
                        }}
                        onFocus={() => newItemProdutoSearch && setShowNewProdutoDropdown(true)}
                        onBlur={() => setTimeout(() => setShowNewProdutoDropdown(false), 200)}
                        className="h-7 text-sm"
                      />
                      {showNewProdutoDropdown && (
                        <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
                          {produtos
                            .filter((p) =>
                              p.nome.toLowerCase().includes((newItemProdutoSearch || "").toLowerCase()),
                            )
                            .slice(0, 6)
                            .map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                                onMouseDown={() => {
                                  setNewItem((prev) => ({
                                    ...prev,
                                    product_id: p.id,
                                    product_name: p.nome,
                                    unit_price: p.preco_referencia ?? prev.unit_price,
                                    unit_cost: p.custo_referencia ?? prev.unit_cost,
                                  }));
                                  setNewItemProdutoSearch("");
                                  setShowNewProdutoDropdown(false);
                                }}
                              >
                                {p.nome}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="relative">
                      <Input
                        placeholder="Fornecedor..."
                        value={newItemFornecedorSearch || newItem.supplier_name}
                        onChange={(e) => {
                          setNewItemFornecedorSearch(e.target.value);
                          setNewItem((prev) => ({
                            ...prev,
                            supplier_name: e.target.value,
                            supplier_id: "",
                          }));
                          setShowNewFornecedorDropdown(true);
                        }}
                        onFocus={() => newItemFornecedorSearch && setShowNewFornecedorDropdown(true)}
                        onBlur={() => setTimeout(() => setShowNewFornecedorDropdown(false), 200)}
                        className="h-7 text-sm"
                      />
                      {showNewFornecedorDropdown && (
                        <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-40 overflow-y-auto rounded-md border bg-popover shadow-md">
                          {fornecedores
                            .filter((f) =>
                              f.nome
                                .toLowerCase()
                                .includes((newItemFornecedorSearch || "").toLowerCase()),
                            )
                            .slice(0, 6)
                            .map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                                onMouseDown={() => {
                                  setNewItem((prev) => ({
                                    ...prev,
                                    supplier_id: f.id,
                                    supplier_name: f.nome,
                                  }));
                                  setNewItemFornecedorSearch("");
                                  setShowNewFornecedorDropdown(false);
                                }}
                              >
                                {f.nome}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={newItem.quantity || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^[0-9]*[,.]?[0-9]*$/.test(val)) {
                          setNewItem((prev) => ({
                            ...prev,
                            quantity: parseFloat(val.replace(",", ".")) || 0,
                          }));
                        }
                      }}
                      className="h-7 w-16 text-right text-sm"
                    />
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <MoneyInput
                      value={newItem.unit_price}
                      onChange={(v) => setNewItem((prev) => ({ ...prev, unit_price: v }))}
                      className="h-7 w-24 text-right text-sm"
                    />
                  </td>
                  <td className="py-2 pr-4" />
                  <td className="py-2">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={handleSaveNewItem}
                        disabled={savingNewItem}
                        title="Salvar"
                      >
                        {savingNewItem ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setAddingItem(false)}
                        title="Cancelar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit notes modal */}
      <Dialog open={editGeneralOpen} onOpenChange={setEditGeneralOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Observações</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Observações</Label>
            <Textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGeneralOpen(false)} disabled={savingGeneral}>
              Cancelar
            </Button>
            <Button onClick={handleSaveGeneral} disabled={savingGeneral}>
              {savingGeneral && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as lost modal */}
      <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar orçamento como perdido</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Motivo (opcional)</Label>
            <Textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              rows={3}
              placeholder="Ex.: preço, prazo, concorrência..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostDialogOpen(false)} disabled={savingLost}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleMarkAsLost} disabled={savingLost}>
              {savingLost && <Loader2 className="h-4 w-4 animate-spin" />}
              Marcar como perdido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete item dialog */}
      <DeleteConfirmDialog
        open={deleteItemDialog}
        onClose={() => {
          setDeleteItemDialog(false);
          setDeletingItem(null);
        }}
        onConfirm={handleDeleteItemConfirm}
        title="Remover item"
        description={`Tem certeza que deseja remover "${deletingItem?.product_name ?? "este item"}"?`}
      />
    </div>
  );
}
