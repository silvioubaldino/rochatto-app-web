"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntityFormDialog } from "@/components/entity/EntityFormDialog";
import { CustomersTable, ObligationsTable, QuotesTable, SalesTable } from "@/components/entity/related-lists";
import { ActionsMenu } from "@/components/patterns/ActionsMenu";
import { PageHeader } from "@/components/patterns/detail";
import { PageSkeleton } from "@/components/patterns/skeletons";
import { ErrorState } from "@/components/patterns/states";
import { useUrlTab } from "@/components/patterns/useUrlTab";
import { MoneyText } from "@/components/patterns/values";
import { useClientes } from "@/hooks/useClientes";
import { usePartner } from "@/hooks/usePartners";
import { useQuotes } from "@/hooks/useQuotes";
import { useVendas } from "@/hooks/useVendas";
import { PARTNER_TYPE_LABELS, formatPercentRate } from "@/lib/format";
import { PARTNER_TABS, partnerStats, type PartnerTab } from "../model";
import { usePartnerCommissions } from "../queries";
import { PartnerForm } from "./PartnerForm";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold">{children}</dd>
    </div>
  );
}

/** Parceiro 360 (T09): indicações, faturamento indicado, conversão e comissões a pagar (sem módulo de comissão — RF-25). */
export function PartnerPage({ id }: { id: string }) {
  const { partner, isLoading, error } = usePartner(id);
  const { clientes, isLoading: customersLoading } = useClientes(undefined, { referrer_id: id });
  const { quotes, isLoading: quotesLoading } = useQuotes({ referrer_id: id });
  const { vendas, isLoading: salesLoading } = useVendas({ referrer_id: id });
  const commissions = usePartnerCommissions(id);
  const [tab, setTab] = useUrlTab(PARTNER_TABS, "clientes");
  const [editing, setEditing] = useState(false);

  if (error) return <ErrorState message="Parceiro não encontrado." />;
  if (isLoading || !partner) return <PageSkeleton className="max-w-5xl" />;
  const stats = partnerStats(clientes, quotes, vendas, commissions.items);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        title={partner.name}
        subtitle={[PARTNER_TYPE_LABELS[partner.type], partner.phone].filter(Boolean).join(" · ")}
        backFallback="/parceiros"
        backLabel="Parceiros"
        menu={<ActionsMenu items={[{ id: "edit", label: "Editar cadastro", onSelect: () => setEditing(true) }]} />}
      />
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Clientes indicados">{stats.customers}</Stat>
        <Stat label="Orçamentos / vendas">{stats.quotes} / {stats.sales}</Stat>
        <Stat label="Faturamento indicado"><MoneyText value={stats.revenue} /></Stat>
        <Stat label="Conversão">{formatPercentRate(stats.conversion)}</Stat>
        <Stat label="Comissões a pagar"><MoneyText value={stats.commissionsOpen} tone={stats.commissionsOpen > 0 ? "warning" : undefined} /></Stat>
      </dl>
      {partner.notes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{partner.notes}</p>}

      <Tabs value={tab} onValueChange={(v) => setTab(v as PartnerTab)}>
        <TabsList>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
        </TabsList>
        <TabsContent value="clientes"><CustomersTable rows={clientes} isLoading={customersLoading} /></TabsContent>
        <TabsContent value="orcamentos"><QuotesTable rows={quotes} isLoading={quotesLoading} /></TabsContent>
        <TabsContent value="vendas"><SalesTable rows={vendas} isLoading={salesLoading} /></TabsContent>
        <TabsContent value="comissoes"><ObligationsTable rows={commissions.items} isLoading={commissions.isLoading} empty="Nenhuma comissão a pagar." /></TabsContent>
      </Tabs>

      {editing && <EntityFormDialog open onClose={() => setEditing(false)} titles={{ create: "Novo parceiro", edit: "Editar parceiro" }} Form={PartnerForm} entity={partner} />}
    </div>
  );
}
