"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { useVenda } from "@/hooks/useVenda";
import { usePagamentos } from "@/hooks/usePagamentos";
import { useProdutos } from "@/hooks/useProdutos";
import { useFornecedores } from "@/hooks/useFornecedores";
import { api, APIError } from "@/lib/api";
import { formatMoeda, formatData } from "@/lib/formatters";
import { toSaleUpdatePayload } from "@/lib/sales";
import type { PagamentoCliente } from "@/lib/types";
import { SaleDeliveryBadge, SalePaymentBadge } from "@/components/status-badges";
import { SaleItemsCard } from "@/components/sales/SaleItemsCard";
import { SaleDeliveryActions } from "@/components/sales/SaleDeliveryActions";
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
import { ArrowLeft, Pencil, Trash2, Plus, Loader2, Check, Ban } from "lucide-react";

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

  // Edit general info
  const [editGeneralOpen, setEditGeneralOpen] = useState(false);
  const [editObservacoes, setEditObservacoes] = useState("");
  const [editPrazo, setEditPrazo] = useState("");
  const [savingGeneral, setSavingGeneral] = useState(false);

  // --- Edit general ---
  async function handleSaveGeneral() {
    if (!venda) return;
    setSavingGeneral(true);
    try {
      await api.put(
        `/vendas/${vendaId}`,
        toSaleUpdatePayload(venda, {
          observacoes: editObservacoes.trim() || null,
          data_entrega_prevista: editPrazo || null,
        }),
      );
      toast.success("Venda atualizada.");
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
      if (!venda) return;
      await api.put(`/vendas/${vendaId}`, toSaleUpdatePayload(venda, fretePayload));
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
      await api.put(
        `/vendas/${vendaId}`,
        toSaleUpdatePayload(venda, { comissao_paga: !venda.comissao_paga }),
      );
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
  // AYD-002: Sale cancelada é terminal e somente leitura (a API responde 409 a alterações).
  const readOnly = venda.delivery_status === "CANCELED";

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

        <SaleDeliveryBadge status={venda.delivery_status} />
        <SalePaymentBadge status={venda.payment_status} />

        <div className="ml-auto">
          <SaleDeliveryActions
            vendaId={vendaId}
            status={venda.delivery_status}
            onChanged={refresh}
          />
        </div>
      </div>

      {readOnly && (
        <div className="flex items-start gap-2 rounded-md border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-800">
          <Ban className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Venda cancelada — somente leitura. Ela não entra nos totais, no lucro, no
            &quot;a receber&quot;, na fila de compras nem nas saídas de estoque.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* General info */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">
              Informações Gerais
            </h2>
            {!readOnly && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setEditObservacoes(venda.observacoes || "");
                  setEditPrazo(venda.data_entrega_prevista?.slice(0, 10) ?? "");
                  setEditGeneralOpen(true);
                }}
                title="Editar prazo de entrega e observações"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Cliente</dt>
            <dd className="font-medium">{venda.cliente_nome}</dd>
            <dt className="text-muted-foreground">Data</dt>
            <dd>{formatData(venda.data_venda)}</dd>
            <dt className="text-muted-foreground">Prazo de entrega</dt>
            <dd>
              {venda.data_entrega_prevista
                ? formatData(venda.data_entrega_prevista)
                : "—"}
            </dd>
            <dt className="text-muted-foreground">Parceiro</dt>
            <dd>{venda.vendedor_externo_nome || "—"}</dd>
            <dt className="text-muted-foreground">Entrega</dt>
            <dd>
              <SaleDeliveryBadge status={venda.delivery_status} />
            </dd>
            <dt className="text-muted-foreground">Observações</dt>
            <dd>{venda.observacoes || "—"}</dd>
            {venda.quote_id && (
              <>
                <dt className="text-muted-foreground">Origem</dt>
                <dd>
                  <Link
                    href={`/orcamentos/${venda.quote_id}`}
                    className="text-primary hover:underline"
                  >
                    Originado do Orçamento #{venda.quote_id.slice(0, 8)}
                  </Link>
                </dd>
              </>
            )}
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
            <dt className="text-muted-foreground">Pagamento</dt>
            <dd>
              <SalePaymentBadge status={venda.payment_status} />
            </dd>

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

      {/* Itens — origem/Supplier por Item (AYD-002) */}
      <SaleItemsCard
        vendaId={vendaId}
        itens={venda.itens ?? []}
        readOnly={readOnly}
        produtos={produtos}
        fornecedores={fornecedores}
        onChanged={refresh}
      />

      {/* Pagamentos do Cliente */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">
            Pagamentos do Cliente
          </h2>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={handleNewPagamento}>
              <Plus className="h-3.5 w-3.5" />
              Registrar Receb.
            </Button>
          )}
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
                    {!readOnly && <th className="pb-2 font-medium w-28">Ações</th>}
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
                        {!readOnly && (
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
                        )}
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
                {!readOnly && (
                  <Button variant="ghost" size="icon-xs" onClick={startEditFrete} title="Editar frete">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
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
              disabled={comissaoLoading || readOnly}
            >
              {comissaoLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {venda.comissao_paga ? "Desmarcar" : "Marcar como paga"}
            </Button>
          </div>
        )}
      </Card>

      {/* Edit observacoes modal */}
      <Dialog open={editGeneralOpen} onOpenChange={setEditGeneralOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="venda-prazo">Prazo de entrega</Label>
            <Input
              id="venda-prazo"
              type="date"
              value={editPrazo}
              onChange={(e) => setEditPrazo(e.target.value)}
            />
            <Label htmlFor="venda-obs">Observações</Label>
            <textarea
              id="venda-obs"
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
