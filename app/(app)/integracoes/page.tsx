"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useConnections } from "@/hooks/useConnections";
import { api, APIError } from "@/lib/api";
import { formatConnectionScope, formatDataHora } from "@/lib/formatters";
import type { Connection } from "@/lib/types";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Unplug } from "lucide-react";

export default function IntegracoesPage() {
  const { connections, isLoading, error, refresh } = useConnections();
  const [toRevoke, setToRevoke] = useState<Connection | null>(null);

  async function handleRevoke() {
    if (!toRevoke) return;
    try {
      await api.delete(`/oauth/connections/${toRevoke.id}`);
      toast.success("Conexão desconectada.");
    } catch (err) {
      // 404: já revogada (ex.: em outra aba) — o efeito desejado já aconteceu.
      if (err instanceof APIError && err.status === 404) {
        toast.info("Esta conexão já havia sido desconectada.");
      } else {
        toast.error(err instanceof APIError ? err.message : "Erro ao desconectar.");
        return;
      }
    }
    setToRevoke(null);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
        <p className="text-sm text-muted-foreground">
          Conexões do assistente (Claude) com o sistema. Para conectar, adicione o conector
          no Claude e autorize aqui. Ao desconectar, o próximo uso no Claude pede novo login.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível carregar as conexões.{" "}
          <button className="underline" onClick={() => refresh()}>
            Tentar novamente
          </button>
        </p>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma conexão ativa.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {connections.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <p className="font-medium">{c.client_name}</p>
                  <div className="flex flex-wrap gap-1">
                    {c.scopes.map((s) => (
                      <Badge key={s} variant="secondary" title={formatConnectionScope(s)}>
                        {s === "read" ? "Leitura" : s === "write" ? "Escrita" : s}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Conectado em {formatDataHora(c.created_at)} · Último uso:{" "}
                    {c.last_used_at ? formatDataHora(c.last_used_at) : "nunca usada"}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setToRevoke(c)}>
                  <Unplug className="h-4 w-4" />
                  Desconectar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={toRevoke !== null}
        onClose={() => setToRevoke(null)}
        onConfirm={handleRevoke}
        title="Desconectar"
        description={`Desconectar "${toRevoke?.client_name ?? ""}"? O Claude perde o acesso imediatamente e pedirá novo login no próximo uso.`}
        confirmLabel="Desconectar"
      />
    </div>
  );
}
