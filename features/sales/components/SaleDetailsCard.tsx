"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EntityLink } from "@/components/entity/EntityLink";
import { DateField, FieldShell } from "@/components/patterns/fields";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { DateText } from "@/components/patterns/values";
import { useQuote } from "@/hooks/useQuote";
import { docNumber } from "@/lib/format";
import type { Venda } from "@/lib/types";
import { useUpdateSale } from "../mutations";

/** Dados da venda (T06 §5): cliente e parceiro com prévia, datas, observações e orçamento de origem. */
export function SaleDetailsCard({ sale, readOnly }: { sale: Venda; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);
  const { quote } = useQuote(sale.quote_id ?? "");
  return (
    <section aria-labelledby="sale-data" className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 id="sale-data" className="text-sm font-semibold">Dados</h2>
        {!readOnly && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil aria-hidden />
            Prazo e observações
          </Button>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Cliente</dt>
        <dd><EntityLink type="customer" id={sale.cliente_id} mode="peek">{sale.cliente_nome}</EntityLink></dd>
        <dt className="text-muted-foreground">Parceiro</dt>
        <dd>{sale.vendedor_externo_id ? <EntityLink type="partner" id={sale.vendedor_externo_id} mode="peek">{sale.vendedor_externo_nome}</EntityLink> : "—"}</dd>
        <dt className="text-muted-foreground">Data</dt>
        <dd><DateText value={sale.data_venda.slice(0, 10)} /></dd>
        <dt className="text-muted-foreground">Prazo de entrega</dt>
        <dd><DateText value={sale.data_entrega_prevista?.slice(0, 10)} /></dd>
        <dt className="text-muted-foreground">Observações</dt>
        <dd className="whitespace-pre-wrap">{sale.observacoes || "—"}</dd>
        {sale.quote_id && (
          <>
            <dt className="text-muted-foreground">Origem</dt>
            <dd><Link href={`/orcamentos/${sale.quote_id}`} className="underline-offset-4 hover:underline">{docNumber("Orçamento", quote?.number, sale.quote_id)} ›</Link></dd>
          </>
        )}
      </dl>
      {editing && <EditDialog sale={sale} onClose={() => setEditing(false)} />}
    </section>
  );
}

function EditDialog({ sale, onClose }: { sale: Venda; onClose: () => void }) {
  const update = useUpdateSale();
  const [due, setDue] = useState(sale.data_entrega_prevista?.slice(0, 10) ?? "");
  const [notes, setNotes] = useState(sale.observacoes ?? "");
  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Prazo e observações"
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={update.pending}>Voltar</Button>
          <Button
            type="button"
            disabled={update.pending}
            onClick={async () => {
              if (await update.mutate(sale, { data_entrega_prevista: due || null, observacoes: notes.trim() || null })) onClose();
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FieldShell label="Prazo de entrega" htmlFor="sale-due"><DateField id="sale-due" value={due} onChange={setDue} /></FieldShell>
        <FieldShell label="Observações" htmlFor="sale-notes"><Textarea id="sale-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></FieldShell>
      </div>
    </ResponsiveDialog>
  );
}
