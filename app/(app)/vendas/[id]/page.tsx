"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useVenda } from "@/hooks/useVenda";
import { usePagamentos } from "@/hooks/usePagamentos";
import { useProdutos } from "@/hooks/useProdutos";
import { useFornecedores } from "@/hooks/useFornecedores";
import { api, APIError } from "@/lib/api";
import { formatMoeda, formatData, STATUS_LABELS } from "@/lib/formatters";
import type { StatusVenda, ItemVenda, PagamentoCliente } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { PagamentoModal } from "@/components/forms/PagamentoModal";
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
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Save,
  X,
  Search,
  Check,
} from "lucide-react";

const ALL_STATUSES: StatusVenda[] = [
  "A_ENTREGAR",
  "A_ENTREGAR_DATA",
  "A_RETIRAR",
  "ENTREGUE_PARCIAL",
  "ENTREGUE",
];

export default function VendaDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const vendaId = params.id as string;
  const { venda, isLoading, refresh } = useVenda(vendaId);
  const { pagamentos, refresh: refreshPagamentos } = usePagamentos(vendaId);
  const { produtos } = useProdutos();
  const { fornecedores } = useFornecedores();

  // Pagamentos state
  const [pagamentoModalOpen, setPagamentoModalOpen] = useState(false);
  const [editingPagamento, setEditingPagamento] = useState<PagamentoCliente | undefined>();
  const [deletePagamentoDialog, setDeletePagamentoDialog] = useState(false);
  const [deletingPagamento, setDeletingPagamento] = useState<PagamentoCliente | null>(null);
  const [confirmPagamentoDialog, setConfirmPagamentoDialog] = useState(false);
  const [confirmingPagamento, setConfirmingPagamento] = useState<PagamentoCliente | null>(null);
  const [confirmDate, setConfirmDate] = useState("");
  const [confirmingLoading, setConfirmingLoading] = useState(false);

  // Status change
  const [statusLoading, setStatusLoading] = useState(false);
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<StatusVenda | null>(null);
  const [entregaDate, setEntregaDate] = useState("");

  // Inline item editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemData, setEditItemData] = useState<Partial<ItemVenda>>({});

  // Add item
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    produto_nome: "",
    produto_id: "",
    fornecedor_nome: "",
    fornecedor_id: "",
    quantidade: 0,
    preco_venda_unit: 0,
    custo_unit: 0,
  });
  const [newItemProdutoSearch, setNewItemProdutoSearch] = useState("");
  const [showNewProdutoDropdown, setShowNewProdutoDropdown] = useState(false);
  const [newItemFornecedorSearch, setNewItemFornecedorSearch] = useState("");
  const [showNewFornecedorDropdown, setShowNewFornecedorDropdown] = useState(false);
  const [savingNewItem, setSavingNewItem] = useState(false);

  // Delete item
  const [deleteItemDialog, setDeleteItemDialog] = useState(false);
  const [deletingItem, setDeletingItem] = useState<ItemVenda | null>(null);

  // Edit general info
  const [editGeneralOpen, setEditGeneralOpen] = useState(false);
  const [editObservacoes, setEditObservacoes] = useState("");
  const [savingGeneral, setSavingGeneral] = useState(false);

  // --- Status change ---
  async function handleStatusChange(newStatus: StatusVenda) {
    if (!venda) return;
    if (newStatus === venda.status) return;

    if (newStatus === "A_ENTREGAR_DATA") {
      setPendingStatus(newStatus);
      setEntregaDate("");
      setDateModalOpen(true);
      return;
    }

    if (newStatus === "ENTREGUE" && venda.status !== "ENTREGUE") {
      const confirmed = window.confirm("Confirma que a venda foi entregue?");
      if (!confirmed) return;
    }

    await saveStatus(newStatus);
  }

  async function saveStatus(newStatus: StatusVenda, dataEntrega?: string) {
    setStatusLoading(true);
    try {
      await api.put(`/vendas/${vendaId}`, {
        status: newStatus,
        ...(dataEntrega ? { data_entrega_prevista: dataEntrega } : {}),
      });
      toast.success("Status atualizado.");
      refresh();
    } catch (err) {
      const message = err instanceof APIError ? err.message : "Erro ao atualizar status.";
      toast.error(message);
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleDateConfirm() {
    if (!entregaDate) {
      toast.error("Informe a data de entrega.");
      return;
    }
    setDateModalOpen(false);
    if (pendingStatus) {
      await saveStatus(pendingStatus, entregaDate);
      setPendingStatus(null);
    }
  }

  // --- Inline item edit ---
  function startEditItem(item: ItemVenda) {
    setEditingItemId(item.id);
    setEditItemData({
      preco_venda_unit: item.preco_venda_unit,
      custo_unit: item.custo_unit,
      quantidade: item.quantidade,
      fornecedor_nome: item.fornecedor_nome,
    });
  }

  function cancelEditItem() {
    setEditingItemId(null);
    setEditItemData({});
  }

  async function saveEditItem(itemId: string) {
    try {
      await api.put(`/vendas/${vendaId}/itens/${itemId}`, editItemData);
      toast.success("Item atualizado.");
      cancelEditItem();
      refresh();
    } catch (err) {
      const message = err instanceof APIError ? err.message : "Erro ao atualizar item.";
      toast.error(message);
    }
  }

  // --- Delete item ---
  function handleDeleteItemClick(item: ItemVenda) {
    setDeletingItem(item);
    setDeleteItemDialog(true);
  }

  const handleDeleteItemConfirm = useCallback(async () => {
    if (!deletingItem) return;
    try {
      await api.delete(`/vendas/${vendaId}/itens/${deletingItem.id}`);
      toast.success("Item removido.");
      refresh();
    } catch (err) {
      const message = err instanceof APIError ? err.message : "Erro ao remover item.";
      toast.error(message);
    } finally {
      setDeleteItemDialog(false);
      setDeletingItem(null);
    }
  }, [deletingItem, vendaId, refresh]);

  // --- Add new item ---
  async function handleSaveNewItem() {
    if (!newItem.produto_nome) {
      toast.error("Informe o produto.");
      return;
    }
    setSavingNewItem(true);
    try {
      await api.post(`/vendas/${vendaId}/itens`, newItem);
      toast.success("Item adicionado.");
      setAddingItem(false);
      setNewItem({
        produto_nome: "",
        produto_id: "",
        fornecedor_nome: "",
        fornecedor_id: "",
        quantidade: 0,
        preco_venda_unit: 0,
        custo_unit: 0,
      });
      refresh();
    } catch (err) {
      const message = err instanceof APIError ? err.message : "Erro ao adicionar item.";
      toast.error(message);
    } finally {
      setSavingNewItem(false);
    }
  }

  // --- Edit general ---
  async function handleSaveGeneral() {
    setSavingGeneral(true);
    try {
      await api.put(`/vendas/${vendaId}`, { observacoes: editObservacoes });
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

  // --- Frete update ---
  const [editingFrete, setEditingFrete] = useState(false);
  const [fretePayload, setFretePayload] = useState({ frete_valor: 0, frete_pago: 0 });
  const [savingFrete, setSavingFrete] = useState(false);

  function startEditFrete() {
    if (!venda) return;
    setFretePayload({ frete_valor: venda.frete_valor, frete_pago: venda.frete_pago });
    setEditingFrete(true);
  }

  async function saveFrete() {
    setSavingFrete(true);
    try {
      await api.put(`/vendas/${vendaId}`, fretePayload);
      toast.success("Frete atualizado.");
      setEditingFrete(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao atualizar frete.");
    } finally {
      setSavingFrete(false);
    }
  }

  // --- Comissão paga ---
  const [comissaoLoading, setComissaoLoading] = useState(false);

  async function toggleComissaoPaga() {
    if (!venda) return;
    setComissaoLoading(true);
    try {
      await api.put(`/vendas/${vendaId}`, { comissao_paga: !venda.comissao_paga });
      toast.success(venda.comissao_paga ? "Comissão desmarcada." : "Comissão marcada como paga.");
      refresh();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao atualizar comissão.");
    } finally {
      setComissaoLoading(false);
    }
  }

  // --- Pagamento handlers ---
  function handleNewPagamento() {
    setEditingPagamento(undefined);
    setPagamentoModalOpen(true);
  }

  function handleEditPagamento(pag: PagamentoCliente) {
    setEditingPagamento(pag);
    setPagamentoModalOpen(true);
  }

  function handleDeletePagamentoClick(pag: PagamentoCliente) {
    setDeletingPagamento(pag);
    setDeletePagamentoDialog(true);
  }

  const handleDeletePagamentoConfirm = useCallback(async () => {
    if (!deletingPagamento) return;
    try {
      await api.delete(`/vendas/${vendaId}/pagamentos/${deletingPagamento.id}`);
      toast.success("Pagamento excluído.");
      refreshPagamentos();
      refresh();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao excluir pagamento.");
    } finally {
      setDeletePagamentoDialog(false);
      setDeletingPagamento(null);
    }
  }, [deletingPagamento, vendaId, refreshPagamentos, refresh]);

  function handleConfirmPagamentoClick(pag: PagamentoCliente) {
    setConfirmingPagamento(pag);
    setConfirmDate(pag.data_agendada ? pag.data_agendada.slice(0, 10) : "");
    setConfirmPagamentoDialog(true);
  }

  async function handleConfirmPagamento() {
    if (!confirmingPagamento || !confirmDate) return;
    setConfirmingLoading(true);
    try {
      await api.post(`/vendas/${vendaId}/pagamentos/${confirmingPagamento.id}/confirmar`, {
        data_pagamento: confirmDate,
      });
      toast.success("Pagamento confirmado.");
      setConfirmPagamentoDialog(false);
      setConfirmingPagamento(null);
      refreshPagamentos();
      refresh();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao confirmar pagamento.");
    } finally {
      setConfirmingLoading(false);
    }
  }

  function handlePagamentoSuccess() {
    refreshPagamentos();
    refresh();
  }

  function getPagamentoStatusInfo(pag: PagamentoCliente) {
    if (pag.status === "recebido") {
      return {
        label: `Recebido em ${pag.data_pagamento ? formatData(pag.data_pagamento) : "—"}`,
        color: "text-green-600",
        bg: "bg-green-50",
      };
    }
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const agendada = pag.data_agendada ? new Date(pag.data_agendada) : null;
    if (agendada && agendada < hoje) {
      return {
        label: `Vencido — ${formatData(pag.data_agendada!)}`,
        color: "text-red-600",
        bg: "bg-red-50",
      };
    }
    return {
      label: `Agendado para ${pag.data_agendada ? formatData(pag.data_agendada) : "—"}`,
      color: "text-yellow-700",
      bg: "bg-yellow-50",
    };
  }

  // Loading state
  if (isLoading || !venda) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const margem = venda.total_venda > 0 ? (venda.lucro / venda.total_venda) * 100 : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/vendas")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Venda</h1>
        <span className="text-sm text-muted-foreground font-mono">
          #{venda.id.slice(0, 8)}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {statusLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          <select
            value={venda.status}
            onChange={(e) => handleStatusChange(e.target.value as StatusVenda)}
            disabled={statusLoading}
            className="h-8 rounded-md border border-input bg-background px-3 text-sm font-medium"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* General info */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">
              Informações Gerais
            </h2>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setEditObservacoes(venda.observacoes || "");
                setEditGeneralOpen(true);
              }}
              title="Editar observações"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Cliente</dt>
            <dd className="font-medium">{venda.cliente_nome}</dd>
            <dt className="text-muted-foreground">Data</dt>
            <dd>{formatData(venda.data_venda)}</dd>
            <dt className="text-muted-foreground">Entrega</dt>
            <dd>
              {venda.data_entrega_prevista
                ? formatData(venda.data_entrega_prevista)
                : "—"}
            </dd>
            <dt className="text-muted-foreground">Vendedor</dt>
            <dd>{venda.vendedor_externo_nome || "—"}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <StatusBadge status={venda.status} dataEntrega={venda.data_entrega_prevista} />
            </dd>
            <dt className="text-muted-foreground">Observações</dt>
            <dd>{venda.observacoes || "—"}</dd>
          </dl>
        </Card>

        {/* Financial summary */}
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">
            Resumo Financeiro
          </h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Total Venda</dt>
            <dd className="font-semibold">{formatMoeda(venda.total_venda)}</dd>
            <dt className="text-muted-foreground">Total Custo</dt>
            <dd>{formatMoeda(venda.total_custo)}</dd>

            <dt className="text-muted-foreground">Recebido</dt>
            <dd className="text-green-600">{formatMoeda(venda.total_recebido)}</dd>
            <dt className="text-muted-foreground">A Receber</dt>
            <dd className="font-semibold text-orange-600">{formatMoeda(venda.a_receber)}</dd>

            <dt className="text-muted-foreground">A Pagar Fornec.</dt>
            <dd>{formatMoeda(venda.a_pagar_fornecedor)}</dd>
            <dt className="text-muted-foreground">Frete a Pagar</dt>
            <dd>{formatMoeda(venda.frete_valor - venda.frete_pago)}</dd>
            <dt className="text-muted-foreground">Comissão Devida</dt>
            <dd>{venda.comissao_paga ? formatMoeda(0) : formatMoeda(venda.comissao_valor)}</dd>

            <dt className="text-muted-foreground">Lucro Estimado</dt>
            <dd className={`font-semibold ${venda.lucro < 0 ? "text-destructive" : "text-green-600"}`}>
              {formatMoeda(venda.lucro)}
            </dd>
            <dt className="text-muted-foreground">Margem</dt>
            <dd className="font-semibold">{margem.toFixed(1)}%</dd>
          </dl>
        </Card>
      </div>

      {/* Itens */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">
            Itens da Venda
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddingItem(true)}
            disabled={addingItem}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Produto</th>
                <th className="pb-2 pr-4 font-medium">Fornecedor</th>
                <th className="pb-2 pr-4 font-medium text-right">Qtd</th>
                <th className="pb-2 pr-4 font-medium text-right">Total Venda</th>
                <th className="pb-2 pr-4 font-medium text-right">Total Custo</th>
                <th className="pb-2 pr-4 font-medium text-right">A Pagar Forn.</th>
                <th className="pb-2 font-medium w-20">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(venda.itens || []).map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">{item.produto_nome}</td>
                  <td className="py-2 pr-4">{item.fornecedor_nome || "—"}</td>
                  {editingItemId === item.id ? (
                    <>
                      <td className="py-2 pr-4 text-right">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={editItemData.quantidade ?? ""}
                          onChange={(e) =>
                            setEditItemData((prev) => ({
                              ...prev,
                              quantidade: parseFloat(e.target.value.replace(",", ".")) || 0,
                            }))
                          }
                          className="h-7 w-16 text-right text-sm"
                        />
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <MoneyInput
                          value={editItemData.preco_venda_unit ?? 0}
                          onChange={(v) =>
                            setEditItemData((prev) => ({ ...prev, preco_venda_unit: v }))
                          }
                          className="h-7 w-24 text-right text-sm"
                        />
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <MoneyInput
                          value={editItemData.custo_unit ?? 0}
                          onChange={(v) =>
                            setEditItemData((prev) => ({ ...prev, custo_unit: v }))
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
                      <td className="py-2 pr-4 text-right">{item.quantidade}</td>
                      <td className="py-2 pr-4 text-right">{formatMoeda(item.total_venda)}</td>
                      <td className="py-2 pr-4 text-right">{formatMoeda(item.total_custo)}</td>
                      <td className="py-2 pr-4 text-right">{formatMoeda(item.a_pagar_fornecedor)}</td>
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
                    </>
                  )}
                </tr>
              ))}

              {/* New item row */}
              {addingItem && (
                <tr className="border-b bg-muted/20">
                  <td className="py-2 pr-4">
                    <div className="relative">
                      <Input
                        placeholder="Produto..."
                        value={newItemProdutoSearch || newItem.produto_nome}
                        onChange={(e) => {
                          setNewItemProdutoSearch(e.target.value);
                          setNewItem((prev) => ({
                            ...prev,
                            produto_nome: e.target.value,
                            produto_id: "",
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
                                    produto_id: p.id,
                                    produto_nome: p.nome,
                                    preco_venda_unit: p.preco_referencia ?? prev.preco_venda_unit,
                                    custo_unit: p.custo_referencia ?? prev.custo_unit,
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
                        value={newItemFornecedorSearch || newItem.fornecedor_nome}
                        onChange={(e) => {
                          setNewItemFornecedorSearch(e.target.value);
                          setNewItem((prev) => ({
                            ...prev,
                            fornecedor_nome: e.target.value,
                            fornecedor_id: "",
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
                                    fornecedor_id: f.id,
                                    fornecedor_nome: f.nome,
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
                      value={newItem.quantidade || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^[0-9]*[,.]?[0-9]*$/.test(val)) {
                          setNewItem((prev) => ({
                            ...prev,
                            quantidade: parseFloat(val.replace(",", ".")) || 0,
                          }));
                        }
                      }}
                      className="h-7 w-16 text-right text-sm"
                    />
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <MoneyInput
                      value={newItem.preco_venda_unit}
                      onChange={(v) => setNewItem((prev) => ({ ...prev, preco_venda_unit: v }))}
                      className="h-7 w-24 text-right text-sm"
                    />
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <MoneyInput
                      value={newItem.custo_unit}
                      onChange={(v) => setNewItem((prev) => ({ ...prev, custo_unit: v }))}
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

      {/* Pagamentos do Cliente */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">
            Pagamentos do Cliente
          </h2>
          <Button variant="outline" size="sm" onClick={handleNewPagamento}>
            <Plus className="h-3.5 w-3.5" />
            Registrar Receb.
          </Button>
        </div>

        {pagamentos.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Valor</th>
                    <th className="pb-2 pr-4 font-medium">Data</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Obs</th>
                    <th className="pb-2 font-medium w-28">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map((pag) => {
                    const info = getPagamentoStatusInfo(pag);
                    return (
                      <tr key={pag.id} className={`border-b last:border-b-0 ${info.bg}`}>
                        <td className="py-2 pr-4 font-medium">
                          {formatMoeda(pag.valor)}
                        </td>
                        <td className="py-2 pr-4">
                          {pag.data_pagamento
                            ? formatData(pag.data_pagamento)
                            : pag.data_agendada
                              ? formatData(pag.data_agendada)
                              : "—"}
                        </td>
                        <td className={`py-2 pr-4 font-medium ${info.color}`}>
                          {info.label}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground max-w-[150px] truncate">
                          {pag.observacoes || "—"}
                        </td>
                        <td className="py-2">
                          <div className="flex gap-1">
                            {pag.status === "pendente" && (
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleConfirmPagamentoClick(pag)}
                                title="Confirmar recebimento"
                                className="text-green-600"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleEditPagamento(pag)}
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleDeletePagamentoClick(pag)}
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals + progress bar */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span>
                  Total Recebido:{" "}
                  <strong className="text-green-600">
                    {formatMoeda(venda.total_recebido)}
                  </strong>
                </span>
                <span>
                  A Receber:{" "}
                  <strong className="text-orange-600">
                    {formatMoeda(venda.a_receber)}
                  </strong>
                </span>
              </div>
              {(() => {
                const pct =
                  venda.total_venda > 0
                    ? Math.min((venda.total_recebido / venda.total_venda) * 100, 100)
                    : 0;
                const isFullyPaid = pct >= 100;
                return (
                  <div className="space-y-1">
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isFullyPaid ? "bg-green-500" : "bg-blue-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className={`text-xs font-medium ${isFullyPaid ? "text-green-600" : "text-muted-foreground"}`}>
                      {isFullyPaid ? "Totalmente pago" : `${pct.toFixed(0)}% recebido`}
                    </p>
                  </div>
                );
              })()}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum pagamento registrado.
          </p>
        )}
      </Card>

      {/* Frete e Comissão */}
      <Card className="p-4 space-y-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">
          Frete e Comissão
        </h2>

        {/* Frete */}
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-sm">
            {editingFrete ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Frete Negociado</span>
                  <MoneyInput
                    value={fretePayload.frete_valor}
                    onChange={(v) => setFretePayload((p) => ({ ...p, frete_valor: v }))}
                    className="h-8 w-28"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Pago</span>
                  <MoneyInput
                    value={fretePayload.frete_pago}
                    onChange={(v) => setFretePayload((p) => ({ ...p, frete_pago: v }))}
                    className="h-8 w-28"
                  />
                </div>
                <Button size="sm" onClick={saveFrete} disabled={savingFrete}>
                  {savingFrete && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingFrete(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <>
                <span>
                  Frete: <strong>{formatMoeda(venda.frete_valor)}</strong>
                </span>
                <span>
                  Pago: <strong>{formatMoeda(venda.frete_pago)}</strong>
                </span>
                <span>
                  A Pagar:{" "}
                  <strong className="text-orange-600">
                    {formatMoeda(venda.frete_valor - venda.frete_pago)}
                  </strong>
                </span>
                <Button variant="ghost" size="icon-xs" onClick={startEditFrete} title="Editar frete">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Comissão */}
        {(venda.comissao_valor > 0 || venda.vendedor_externo_nome) && (
          <div className="flex items-center gap-4 text-sm">
            <span>
              Comissão: <strong>{formatMoeda(venda.comissao_valor)}</strong>
              {venda.vendedor_externo_nome && (
                <> para {venda.vendedor_externo_nome}</>
              )}
            </span>
            <span>
              Status:{" "}
              {venda.comissao_paga ? (
                <span className="text-green-600 font-medium">Paga</span>
              ) : (
                <span className="text-orange-600 font-medium">Não paga</span>
              )}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={toggleComissaoPaga}
              disabled={comissaoLoading}
            >
              {comissaoLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {venda.comissao_paga ? "Desmarcar" : "Marcar como paga"}
            </Button>
          </div>
        )}
      </Card>

      {/* Date modal for A_ENTREGAR_DATA */}
      <Dialog open={dateModalOpen} onOpenChange={setDateModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Data de Entrega Prevista</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Data *</Label>
            <Input
              type="date"
              value={entregaDate}
              onChange={(e) => setEntregaDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDateConfirm}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit observacoes modal */}
      <Dialog open={editGeneralOpen} onOpenChange={setEditGeneralOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Observações</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Observações</Label>
            <textarea
              value={editObservacoes}
              onChange={(e) => setEditObservacoes(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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

      {/* Delete item dialog */}
      <DeleteConfirmDialog
        open={deleteItemDialog}
        onClose={() => {
          setDeleteItemDialog(false);
          setDeletingItem(null);
        }}
        onConfirm={handleDeleteItemConfirm}
        title="Remover item"
        description={`Tem certeza que deseja remover "${deletingItem?.produto_nome ?? "este item"}"?`}
      />

      {/* Pagamento modal (criar / editar) */}
      {venda && (
        <PagamentoModal
          open={pagamentoModalOpen}
          onClose={() => {
            setPagamentoModalOpen(false);
            setEditingPagamento(undefined);
          }}
          vendaId={vendaId}
          pagamento={editingPagamento}
          totalVenda={venda.total_venda}
          totalRecebido={venda.total_recebido}
          onSuccess={handlePagamentoSuccess}
        />
      )}

      {/* Delete pagamento dialog */}
      <DeleteConfirmDialog
        open={deletePagamentoDialog}
        onClose={() => {
          setDeletePagamentoDialog(false);
          setDeletingPagamento(null);
        }}
        onConfirm={handleDeletePagamentoConfirm}
        title="Excluir pagamento"
        description={`Tem certeza que deseja excluir o pagamento de ${deletingPagamento ? formatMoeda(deletingPagamento.valor) : ""}?`}
      />

      {/* Confirm pagamento dialog */}
      <Dialog open={confirmPagamentoDialog} onOpenChange={setConfirmPagamentoDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Confirmar recebimento de{" "}
              {confirmingPagamento ? formatMoeda(confirmingPagamento.valor) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Data *</Label>
            <Input
              type="date"
              value={confirmDate}
              onChange={(e) => setConfirmDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmPagamentoDialog(false);
                setConfirmingPagamento(null);
              }}
              disabled={confirmingLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmPagamento} disabled={confirmingLoading || !confirmDate}>
              {confirmingLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
