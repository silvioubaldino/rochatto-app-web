"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { useVenda } from "@/hooks/useVenda";
import { useProdutos } from "@/hooks/useProdutos";
import { useFornecedores } from "@/hooks/useFornecedores";
import { api, APIError } from "@/lib/api";
import { formatMoeda, formatData } from "@/lib/formatters";
import { validateFreight } from "@/lib/sales";
import { toSaleUpdatePayload } from "@/lib/sales";
import { SaleDeliveryBadge, SalePaymentBadge } from "@/components/status-badges";
import { SaleItemsCard } from "@/components/sales/SaleItemsCard";
import { SaleDeliveryActions } from "@/components/sales/SaleDeliveryActions";
import { OriginObligations } from "@/components/obligations/OriginObligations";
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
import { ArrowLeft, Pencil, Loader2, Ban } from "lucide-react";

export default function VendaDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const vendaId = params.id as string;
  const { venda, isLoading, refresh } = useVenda(vendaId);
  const { produtos } = useProdutos();
  const { fornecedores } = useFornecedores();

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
  const [freteValor, setFreteValor] = useState(0);
  const [savingFrete, setSavingFrete] = useState(false);

  function startEditFrete() {
    if (!venda) return;
    setFreteValor(venda.frete_valor);
    setEditingFrete(true);
  }

  async function saveFrete() {
    const freightError = validateFreight(freteValor);
    if (freightError) {
      toast.error(freightError);
      return;
    }
    setSavingFrete(true);
    try {
      if (!venda) return;
      await api.put(`/vendas/${vendaId}`, toSaleUpdatePayload(venda, { frete_valor: freteValor }));
      toast.success("Frete atualizado.");
      setEditingFrete(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao atualizar frete.");
    } finally {
      setSavingFrete(false);
    }
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
            <dd className="font-semibold text-orange-600">{formatMoeda(venda.receivable)}</dd>
            <dt className="text-muted-foreground">Pagamento</dt>
            <dd>
              <SalePaymentBadge status={venda.payment_status} />
            </dd>

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

      {/* Recebimentos: conta a receber do Customer (AYD-007) */}
      <OriginObligations
        originType="SALE"
        originId={vendaId}
        title="Recebimentos e contas da venda"
        detailedDirection="RECEIVABLE"
        readOnly={readOnly}
        onChanged={refresh}
      />

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
                  <MoneyInput value={freteValor} onChange={setFreteValor} className="h-8 w-28" />
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
                {!readOnly && (
                  <Button variant="ghost" size="icon-xs" onClick={startEditFrete} title="Editar frete">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Comissão (o pagamento é feito na conta a pagar acima) */}
        {(venda.comissao_valor > 0 || venda.vendedor_externo_nome) && (
          <div className="flex items-center gap-4 text-sm">
            <span>
              Comissão: <strong>{formatMoeda(venda.comissao_valor)}</strong>
              {venda.vendedor_externo_nome && <> para {venda.vendedor_externo_nome}</>}
            </span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Frete e comissão a pagar aparecem como contas a pagar da venda, acima — pague por lá.
        </p>
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
    </div>
  );
}
