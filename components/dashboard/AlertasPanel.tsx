"use client";

import { useState } from "react";
import { AlertTriangle, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NOTIFICATION_LABELS, formatMoeda, formatData } from "@/lib/formatters";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Notificacao } from "@/lib/types";
import { useRouter } from "next/navigation";

interface AlertasPanelProps {
  notificacoes: Notificacao[];
  isLoading?: boolean;
}

export function AlertasPanel({
  notificacoes,
  isLoading,
}: AlertasPanelProps) {
  const router = useRouter();
  const [removidos, setRemovidos] = useState<Set<string>>(new Set());
  
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
        const vencido = n.tipo === "pagamento_vencido" || n.tipo === "conta_pagar_vencida";
        const dias = n.dias_restantes;
        const diasTexto =
          dias === null
            ? formatData(n.data_ref)
            : vencido
              ? `Venceu há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? "s" : ""} (${formatData(n.data_ref)})`
              : `Vence em ${dias} dia${dias !== 1 ? "s" : ""} (${formatData(n.data_ref)})`;

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
              {NOTIFICATION_LABELS[n.tipo] ?? "Alerta"}
            </div>

            <p className="font-medium">
              {n.cliente_nome} — {formatMoeda(n.valor)}
            </p>
            <p className="text-muted-foreground text-xs">{diasTexto}</p>

            {(n.obligation_id || n.venda_id) && (
              <div className="flex gap-2 mt-2">
                {n.obligation_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => router.push(`/contas/${n.obligation_id}`)}
                  >
                    Ver Conta
                  </Button>
                )}
                {n.venda_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => router.push(`/vendas/${n.venda_id}`)}
                  >
                    Ver Venda
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
