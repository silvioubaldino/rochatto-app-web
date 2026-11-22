"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/patterns/DataTable";
import { PeriodSelector } from "@/components/patterns/PeriodSelector";
import { ErrorState } from "@/components/patterns/states";
import { StatCard } from "@/components/patterns/StatCard";
import { useUrlPeriod } from "@/components/patterns/useUrlPeriod";
import { MoneyText } from "@/components/patterns/values";
import { ListSkeleton } from "@/components/patterns/skeletons";
import { useFinanceSummary } from "@/hooks/useFinance";
import { MOVEMENT_CATEGORY_LABELS, SUPPLIER_KIND_LABELS, formatDate, formatPaymentMethod } from "@/lib/format";
import type { Tone } from "@/lib/format";
import type { FinanceSummary } from "@/lib/types";
import { resultLinks } from "../model";

function Row({ label, value, strong, tone }: { label: string; value: number; strong?: boolean; tone?: Tone }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-semibold" : undefined}><MoneyText value={value} tone={tone} /></dd>
    </div>
  );
}

const SeeMore = ({ href, children }: { href: string; children: string }) => (
  <Link href={href} className="inline-flex min-h-11 items-center text-sm text-primary hover:underline md:min-h-0">
    {children} <ChevronRight className="size-4" aria-hidden />
  </Link>
);

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div>
        <h2 id={id} className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={`rounded-lg border bg-card p-4 ${className ?? ""}`}>{children}</div>;

interface AmountRow {
  key: string;
  label: string;
  amount: number;
}

function AmountTable({ caption, rows, empty }: { caption: string; rows: AmountRow[]; empty: string }) {
  const columns: DataTableColumn<AmountRow>[] = [
    { id: "label", header: "Item", phone: "title", cell: (r) => r.label },
    { id: "amount", header: "Valor", phone: "value", align: "right", cell: (r) => <MoneyText value={r.amount} /> },
  ];
  return <DataTable caption={caption} columns={columns} rows={rows} rowKey={(r) => r.key} empty={{ title: empty }} />;
}

function SummaryView({ summary, from, to }: { summary: FinanceSummary; from: string; to: string }) {
  const { sales, cash, expenses, result, balances } = summary;
  const links = resultLinks({ from, to });
  return (
    <div className="space-y-8">
      <Section id="res-sales" title="Vendas do período" description={`Vendas com data entre ${formatDate(from)} e ${formatDate(to)}, sem as canceladas.`}>
        <Card>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <div>
              <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm"><dt className="text-muted-foreground">Vendas</dt><dd className="tabular-nums">{sales.count}</dd></div>
              <Row label="Faturamento" value={sales.revenue} strong />
              <Row label="Custo" value={sales.cost} />
            </div>
            <div>
              <Row label="Lucro" value={sales.profit} strong tone={sales.profit < 0 ? "danger" : "success"} />
              <Row label="Recebido dessas vendas" value={sales.received} tone="success" />
              <Row label="A receber dessas vendas" value={sales.receivable} tone="warning" />
            </div>
          </dl>
          <SeeMore href={links.sales}>Ver vendas</SeeMore>
        </Card>
      </Section>

      <Section id="res-cash" title="Movimento do período" description="Dinheiro que entrou e saiu com data dentro do período (movimentações).">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <dl>
              <Row label="Entradas" value={cash.inflow} strong tone="success" />
              <Row label="Saídas" value={cash.outflow} strong />
              <Row label="Saldo do movimento" value={cash.net} strong tone={cash.net < 0 ? "danger" : "success"} />
            </dl>
            <div className="flex flex-wrap gap-x-4">
              <SeeMore href={links.movements}>Ver movimentações</SeeMore>
              <SeeMore href={links.unallocated}>Sem alocação</SeeMore>
            </div>
          </Card>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Por categoria</h3>
            <AmountTable caption="Movimento por categoria" rows={cash.by_category.map((c) => ({ key: c.category, label: MOVEMENT_CATEGORY_LABELS[c.category] ?? "—", amount: c.amount }))} empty="Nenhuma movimentação no período." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Recebido por forma de pagamento</h3>
            <AmountTable caption="Recebido por forma de pagamento" rows={cash.received_by_method.map((m) => ({ key: m.payment_method ?? "none", label: formatPaymentMethod(m.payment_method), amount: m.amount }))} empty="Nenhum recebimento no período." />
          </div>
        </div>
      </Section>

      <Section id="res-expenses" title="Despesas" description="Saídas do período sem quitação de conta (combustível, impostos do mês, manutenção…).">
        <Card className="space-y-3">
          <dl><Row label="Total de despesas" value={expenses.total} strong /></dl>
          <AmountTable caption="Despesas por categoria" rows={expenses.by_category.map((c) => ({ key: c.category, label: MOVEMENT_CATEGORY_LABELS[c.category] ?? "—", amount: c.amount }))} empty="Nenhuma despesa no período." />
          <SeeMore href={links.outflows}>Ver saídas</SeeMore>
        </Card>
      </Section>

      <Section id="res-result" title="Resultado do período" description="Lucro das vendas do período menos as despesas.">
        <Card>
          <dl>
            <Row label="Lucro das vendas" value={result.sales_profit} />
            <Row label="Despesas" value={result.expenses} />
            <Row label="Resultado" value={result.net_result} strong tone={result.net_result < 0 ? "danger" : "success"} />
          </dl>
        </Card>
      </Section>

      <Section id="res-open" title="Saldos em aberto (hoje)" description="Não dependem do período escolhido.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard title="A receber" value={<MoneyText value={balances.receivable} />} subtitle="Ver lista" href={links.receivable} />
          <StatCard title="A pagar" value={<MoneyText value={balances.payable} />} subtitle="Ver lista" href={links.payable} />
        </div>
        {balances.payable_by_counterparty_kind.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">A pagar por tipo de credor</h3>
            <AmountTable caption="A pagar por tipo de credor" rows={balances.payable_by_counterparty_kind.map((k) => ({ key: k.kind, label: SUPPLIER_KIND_LABELS[k.kind] ?? "—", amount: k.open }))} empty="Nada a pagar." />
          </div>
        )}
      </Section>
    </div>
  );
}

function Content() {
  const { period, setPeriod, error: periodError } = useUrlPeriod();
  const { summary, isLoading, error, refresh } = useFinanceSummary(period.from, period.to, !periodError);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Resultado</h1>
      <div className="space-y-3">
        <PeriodSelector period={period} onChange={setPeriod} />
        {periodError && <p role="alert" className="text-xs text-destructive">{periodError}</p>}
        <p className="text-sm text-muted-foreground">
          <strong>Vendas do período</strong> usam a data da venda (competência); <strong>movimento</strong>, <strong>despesas</strong> e <strong>resultado</strong> usam as datas das movimentações; os <strong>saldos em aberto</strong> são de hoje.
        </p>
      </div>
      {periodError ? null : isLoading ? <ListSkeleton rows={4} /> : error || !summary ? <ErrorState message="Erro ao carregar o resultado." onRetry={() => void refresh()} /> : <SummaryView summary={summary} from={period.from} to={period.to} />}
    </div>
  );
}

/** Resultado (T14, ex-Financeiro): vendas, movimento, despesas e resultado do período, com o mesmo seletor dos Indicadores. */
export function ResultPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
