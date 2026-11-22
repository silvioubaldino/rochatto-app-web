"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useBack } from "@/lib/history";
import { useCliente } from "@/hooks/useClientes";
import { formatData, LEAD_SOURCE_LABELS } from "@/lib/formatters";
import { ClienteModal } from "@/components/forms/ClienteModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Pencil, FileText } from "lucide-react";

export default function ClienteDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const back = useBack("/clientes");
  const clienteId = params.id as string;
  const { cliente, isLoading, error, refresh } = useCliente(clienteId);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={back}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <p className="text-muted-foreground">Cliente não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" onClick={back}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold flex-1">{cliente.nome}</h1>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
          Editar
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Dados</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Telefone</dt>
          <dd>{cliente.telefone || "—"}</dd>
          <dt className="text-muted-foreground">E-mail</dt>
          <dd>{cliente.email || "—"}</dd>
          <dt className="text-muted-foreground">Endereço</dt>
          <dd>{cliente.endereco || "—"}</dd>
          <dt className="text-muted-foreground">Cidade</dt>
          <dd>{cliente.cidade || "—"}</dd>
          <dt className="text-muted-foreground">Origem</dt>
          <dd>{cliente.lead_source ? LEAD_SOURCE_LABELS[cliente.lead_source] : "—"}</dd>
          {cliente.lead_source === "PARTNER" && (
            <>
              <dt className="text-muted-foreground">Parceiro</dt>
              <dd>{cliente.referrer_name || "—"}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Observações</dt>
          <dd className="whitespace-pre-wrap">{cliente.observacoes || "—"}</dd>
          <dt className="text-muted-foreground">Cadastrado em</dt>
          <dd>{cliente.created_at ? formatData(cliente.created_at) : "—"}</dd>
        </dl>
      </Card>

      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/orcamentos?customer_id=${cliente.id}`)}
      >
        <FileText className="h-4 w-4" />
        Ver orçamentos deste cliente
      </Button>

      <ClienteModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        cliente={cliente}
        onSuccess={refresh}
      />
    </div>
  );
}
