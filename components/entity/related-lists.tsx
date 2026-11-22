"use client";

import { DataTable } from "@/components/patterns/DataTable";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { DateText, MoneyText } from "@/components/patterns/values";
import { docNumber, formatCounterparty, formatLeadSource } from "@/lib/format";
import type { Cliente, Obligation, Quote, Venda } from "@/lib/types";
import { EntityLink } from "./EntityLink";

export function QuotesTable({ rows, isLoading }: { rows: readonly Quote[]; isLoading?: boolean }) {
  return (
    <DataTable
      caption="Orçamentos"
      rows={rows}
      isLoading={isLoading}
      rowKey={(q) => q.id}
      rowHref={(q) => `/orcamentos/${q.id}`}
      empty={{ title: "Nenhum orçamento." }}
      columns={[
        { id: "n", header: "Nº", phone: "title", cell: (q) => docNumber("Orçamento", q.number, q.id) },
        { id: "date", header: "Data", phone: "meta", cell: (q) => <DateText value={q.quote_date.slice(0, 10)} /> },
        { id: "total", header: "Total", phone: "value", align: "right", cell: (q) => <MoneyText value={q.total_quote} /> },
        { id: "status", header: "Status", phone: "badge", cell: (q) => <StatusBadge kind="quote" value={q.status} /> },
      ]}
    />
  );
}

export function SalesTable({ rows, isLoading }: { rows: readonly Venda[]; isLoading?: boolean }) {
  return (
    <DataTable
      caption="Vendas"
      rows={rows}
      isLoading={isLoading}
      rowKey={(s) => s.id}
      rowHref={(s) => `/vendas/${s.id}`}
      empty={{ title: "Nenhuma venda." }}
      columns={[
        { id: "n", header: "Nº", phone: "title", cell: (s) => docNumber("Venda", s.number, s.id) },
        { id: "date", header: "Data", phone: "meta", cell: (s) => <DateText value={s.data_venda.slice(0, 10)} /> },
        { id: "total", header: "Total", phone: "value", align: "right", cell: (s) => <MoneyText value={s.total_venda} /> },
        { id: "receivable", header: "A receber", phone: "meta", align: "right", cell: (s) => <MoneyText value={s.receivable} tone={s.receivable > 0 ? "warning" : undefined} /> },
        { id: "delivery", header: "Entrega", phone: "badge", cell: (s) => <StatusBadge kind="saleDelivery" value={s.delivery_status} /> },
        { id: "payment", header: "Pagamento", phone: "badge", cell: (s) => <StatusBadge kind="salePayment" value={s.payment_status} /> },
      ]}
    />
  );
}

export function ObligationsTable({ rows, isLoading, empty }: { rows: readonly Obligation[]; isLoading?: boolean; empty: string }) {
  return (
    <DataTable
      caption="Contas"
      rows={rows}
      isLoading={isLoading}
      rowKey={(o) => o.id}
      rowHref={(o) => `/contas/${o.id}`}
      empty={{ title: empty }}
      columns={[
        { id: "origin", header: "Origem", phone: "title", cell: (o) => o.origin.label },
        { id: "due", header: "Vencimento", phone: "meta", cell: (o) => <DateText value={o.next_installment?.due_date.slice(0, 10) ?? o.due_date?.slice(0, 10)} tone={o.overdue ? "danger" : undefined} /> },
        { id: "open", header: "Em aberto", phone: "value", align: "right", cell: (o) => <MoneyText value={o.open} tone={o.overdue ? "danger" : undefined} /> },
        { id: "status", header: "Situação", phone: "badge", cell: (o) => <StatusBadge kind="obligation" value={o.status} overdue={o.overdue && o.status !== "SETTLED"} /> },
        { id: "party", header: "Parte", phone: "hidden", cell: (o) => formatCounterparty(o.counterparty) },
      ]}
    />
  );
}

export function CustomersTable({ rows, isLoading }: { rows: readonly Cliente[]; isLoading?: boolean }) {
  return (
    <DataTable
      caption="Clientes"
      rows={rows}
      isLoading={isLoading}
      rowKey={(c) => c.id}
      rowHref={(c) => `/clientes/${c.id}`}
      empty={{ title: "Nenhum cliente indicado." }}
      columns={[
        { id: "name", header: "Nome", phone: "title", cell: (c) => c.nome },
        { id: "city", header: "Cidade", phone: "subtitle", cell: (c) => c.cidade || "—" },
        { id: "source", header: "Origem", phone: "meta", cell: (c) => formatLeadSource(c.lead_source, c.referrer_name) },
        { id: "link", header: "", phone: "hidden", cell: (c) => <EntityLink type="customer" id={c.id} mode="peek">Prévia</EntityLink> },
      ]}
    />
  );
}

