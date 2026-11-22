"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone, MessageCircle, Pencil } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntityFormDialog } from "@/components/entity/EntityFormDialog";
import { ObligationsTable, QuotesTable, SalesTable } from "@/components/entity/related-lists";
import { ActionsMenu } from "@/components/patterns/ActionsMenu";
import { PageHeader } from "@/components/patterns/detail";
import { PageSkeleton } from "@/components/patterns/skeletons";
import { ErrorState } from "@/components/patterns/states";
import { useUrlTab } from "@/components/patterns/useUrlTab";
import { DateText, MoneyText } from "@/components/patterns/values";
import { useCliente } from "@/hooks/useClientes";
import { useQuotes } from "@/hooks/useQuotes";
import { useVendas } from "@/hooks/useVendas";
import { formatLeadSource } from "@/lib/format";
import { CUSTOMER_TABS, customerStats, telHref, whatsappHref, type CustomerTab } from "../model";
import { useCustomerReceivables } from "../queries";
import { CustomerForm } from "./CustomerForm";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold">{children}</dd>
    </div>
  );
}

export function CustomerPage({ id }: { id: string }) {
  const router = useRouter();
  const { cliente, isLoading, error } = useCliente(id);
  const { vendas, isLoading: salesLoading } = useVendas({ cliente_id: id });
  const { quotes, isLoading: quotesLoading } = useQuotes({ customer_id: id });
  const receivables = useCustomerReceivables(id);
  const [tab, setTab] = useUrlTab(CUSTOMER_TABS, "orcamentos");
  const [editing, setEditing] = useState(false);

  if (error) return <ErrorState message="Cliente não encontrado." />;
  if (isLoading || !cliente) return <PageSkeleton className="max-w-5xl" />;

  const stats = customerStats(vendas, receivables.items);
  const openQuotes = quotes.filter((q) => q.status === "OPEN").length;
  const tel = telHref(cliente.telefone);
  const wa = whatsappHref(cliente.telefone);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        title={cliente.nome}
        subtitle={[cliente.cidade, cliente.lead_source ? formatLeadSource(cliente.lead_source, cliente.referrer_name) : null].filter(Boolean).join(" · ")}
        backFallback="/clientes"
        backLabel="Clientes"
        actions={
          <div className="flex gap-2">
            <Link href={`/orcamentos/novo?customer_id=${id}`} className={buttonVariants()}>Novo orçamento</Link>
            <Link href={`/contas/receber?counterparty_type=CUSTOMER&counterparty_id=${id}`} className={buttonVariants({ variant: "outline" })}>Receber</Link>
          </div>
        }
        menu={<ActionsMenu items={[{ id: "edit", label: "Editar cadastro", onSelect: () => setEditing(true) }, { id: "quote", label: "Novo orçamento", onSelect: () => router.push(`/orcamentos/novo?customer_id=${id}`) }]} />}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {cliente.telefone && <span>{cliente.telefone}</span>}
        {tel && <a href={tel} className={buttonVariants({ variant: "outline", size: "sm" })}><Phone aria-hidden />Ligar</a>}
        {wa && <a href={wa} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}><MessageCircle aria-hidden />WhatsApp</a>}
        {cliente.endereco && <span className="text-muted-foreground">{cliente.endereco}</span>}
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total comprado"><MoneyText value={stats.totalBought} /></Stat>
        <Stat label="Lucro"><MoneyText value={stats.profit} /></Stat>
        <Stat label={stats.overdueCount > 0 ? `A receber · ${stats.overdueCount} vencida(s)` : "A receber"}><MoneyText value={stats.receivable} tone={stats.overdueCount > 0 ? "danger" : stats.receivable > 0 ? "warning" : undefined} /></Stat>
        <Stat label="Última venda"><DateText value={stats.lastSale} /></Stat>
      </dl>

      <Tabs value={tab} onValueChange={(v) => setTab(v as CustomerTab)}>
        <TabsList>
          <TabsTrigger value="orcamentos">Orçamentos{openQuotes > 0 ? ` (${openQuotes} abertos)` : ""}</TabsTrigger>
          <TabsTrigger value="vendas">Vendas ({vendas.length})</TabsTrigger>
          <TabsTrigger value="receber">Contas a receber</TabsTrigger>
          <TabsTrigger value="dados">Dados</TabsTrigger>
        </TabsList>
        <TabsContent value="orcamentos"><QuotesTable rows={quotes} isLoading={quotesLoading} /></TabsContent>
        <TabsContent value="vendas"><SalesTable rows={vendas} isLoading={salesLoading} /></TabsContent>
        <TabsContent value="receber"><ObligationsTable rows={receivables.items} isLoading={receivables.isLoading} empty="Nada a receber deste cliente." /></TabsContent>
        <TabsContent value="dados">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border bg-card p-4 text-sm">
            <dt className="text-muted-foreground">E-mail</dt><dd>{cliente.email || "—"}</dd>
            <dt className="text-muted-foreground">Endereço</dt><dd>{cliente.endereco || "—"}</dd>
            <dt className="text-muted-foreground">Cidade</dt><dd>{cliente.cidade || "—"}</dd>
            <dt className="text-muted-foreground">Origem</dt><dd>{formatLeadSource(cliente.lead_source, cliente.referrer_name)}</dd>
            <dt className="text-muted-foreground">Observações</dt><dd className="whitespace-pre-wrap">{cliente.observacoes || "—"}</dd>
          </dl>
          <p className="mt-3"><button type="button" className={buttonVariants({ variant: "outline", size: "sm" })} onClick={() => setEditing(true)}><Pencil aria-hidden />Editar cadastro</button></p>
        </TabsContent>
      </Tabs>

      {editing && <EntityFormDialog open onClose={() => setEditing(false)} titles={{ create: "Novo cliente", edit: "Editar cliente" }} Form={CustomerForm} entity={cliente} />}
    </div>
  );
}
