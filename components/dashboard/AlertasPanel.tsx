"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { AlertTriangle, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoeda, formatData } from "@/lib/formatters";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Notificacao } from "@/lib/types";
import { useRouter } from "next/navigation";

interface AlertasPanelProps {
  notificacoes: Notificacao[];
  isLoading?: boolean;
  onRefresh: () => void;
}

interface ConfirmacaoState {
  notificacaoId: string;
  vendaId: string;
  pagamentoId: string;
  valor: number;
  clienteNome: string;
  data: string;
}

export function AlertasPanel({
  notificacoes,
  isLoading,
  onRefresh,
}: AlertasPanelProps) {
  const router = useRouter();
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoState | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const safeNotificacoes = Array.isArray(notificacoes) ? notificacoes : [];
  const visiveis = safeNotificacoes.filter((n) => !removidos.has(n.id));

  async function marcarLida(id: string) {
    try {
      await api.post(`/dashboard/notificacoes/${id}/lida`, {});
    } catch {
      // ignora erro silenciosamente
    }
    setRemovidos((prev) => new Set([...prev, id]));
  }

  function abrirConfirmacao(n: Notificacao) {
    setConfirmacao({
      notificacaoId: n.id,
      vendaId: n.venda_id,
      pagamentoId: n.pagamento_id,
      valor: n.valor,
      clienteNome: n.cliente_nome,
      data: format(new Date(), "yyyy-MM-dd"),
    });
  }

  async function confirmarRecebimento() {
    if (!confirmacao) return;
    setConfirmando(true);
    try {
      await api.post(
        `/vendas/${confirmacao.vendaId}/pagamentos/${confirmacao.pagamentoId}/confirmar`,
        { data_pagamento: confirmacao.data },
      );
      toast.success("Recebimento confirmado!");
      setRemovidos((prev) => new Set([...prev, confirmacao.notificacaoId]));
      setConfirmacao(null);
      onRefresh();
    } catch {
      toast.error("Erro ao confirmar recebimento.");
    } finally {
      setConfirmando(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (visiveis.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhum alerta de pagamento.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {visiveis.map((n) => {
        const vencido = n.dias_restantes < 0;
        const diasTexto = vencido
          ? `Venceu há ${Math.abs(n.dias_restantes)} dia${Math.abs(n.dias_restantes) !== 1 ? "s" : ""} (${formatData(n.data_ref)})`
          : `Vence em ${n.dias_restantes} dia${n.dias_restantes !== 1 ? "s" : ""} (${formatData(n.data_ref)})`;

        return (
          <div
            key={n.id}
            className={cn(
              "relative rounded-lg border-l-4 p-3 pr-8 text-sm",
              vencido
                ? "bg-red-50 border-red-400"
                : "bg-yellow-50 border-yellow-400",
            )}
          >
            <button
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              onClick={() => marcarLida(n.id)}
              title="Marcar como lido"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1 font-semibold mb-1">
              {vencido ? (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              ) : (
                <Calendar className="h-4 w-4 text-yellow-600" />
              )}
              {vencido ? "Pagamento Vencido" : "Pagamento Agendado"}
            </div>

            <p className="font-medium">
              {n.cliente_nome} — {formatMoeda(n.valor)}
            </p>
            <p className="text-muted-foreground text-xs">{diasTexto}</p>

            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => router.push(`/vendas/${n.venda_id}`)}
              >
                Ver Venda
              </Button>
              {vencido && (
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => abrirConfirmacao(n)}
                >
                  Confirmar Recebimento
                </Button>
              )}
            </div>

            {confirmacao?.notificacaoId === n.id && (
              <div className="mt-3 p-3 rounded-md border bg-white space-y-2">
                <p className="text-sm font-medium">
                  Confirmar recebimento de {formatMoeda(confirmacao.valor)} de{" "}
                  {confirmacao.clienteNome}?
                </p>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Data</Label>
                  <Input
                    type="date"
                    value={confirmacao.data}
                    onChange={(e) =>
                      setConfirmacao((c) =>
                        c ? { ...c, data: e.target.value } : c,
                      )
                    }
                    className="h-7 text-xs w-36"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setConfirmacao(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={confirmando}
                    onClick={confirmarRecebimento}
                  >
                    Confirmar
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
