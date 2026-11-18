"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useFinanceSummary } from "@/hooks/useFinance";
import {
  FINANCE_PRESETS,
  financePresetPeriod,
  matchFinancePreset,
  parseFinancePeriod,
  validateFinancePeriod,
} from "@/lib/finance";
import {
  MOVEMENT_CATEGORY_LABELS,
  SUPPLIER_KIND_LABELS,
  formatData,
  formatMoeda,
  formatPaymentMethod,
} from "@/lib/formatters";
import type { FinanceSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Financeiro — AYD-004/007: vendas do período (competência), movimento do período (dinheiro
// executado), despesas e resultado, e saldos em aberto hoje, cada um levando à lista que o compõe.

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "positive" | "negative" | "warning";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-right tabular-nums",
          strong && "font-semibold",
          tone === "positive" && "text-green-600",
          tone === "negative" && "text-destructive",
          tone === "warning" && "text-orange-600",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function BalanceCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full p-4 transition-colors group-hover:bg-muted/50">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold tabular-nums">{formatMoeda(value)}</p>
        <p className="mt-2 flex items-center text-xs text-primary">
          Ver lista <ChevronRight className="h-3 w-3" />
        </p>
      </Card>
    </Link>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function SummarySkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-40 w-full" />
      ))}
    </div>
  );
}

function SummaryView({ summary, from, to }: { summary: FinanceSummary; from: string; to: string }) {
  const { sales, cash, expenses, result, balances } = summary;
  const movementsParams = new URLSearchParams({ from, to });
  const unallocatedHref = `/movimentacoes?${new URLSearchParams({ from, to, unallocated_only: "true" }).toString()}`;
  const salesHref = `/vendas?${new URLSearchParams({ from, to }).toString()}`;

  return (
    <div className="space-y-8">
      <Section
        title="Vendas do período"
        description={`Vendas com data entre ${formatData(from)} e ${formatData(to)}, sem as canceladas.`}
      >
        <Card className="p-4">
          <dl className="grid gap-x-8 sm:grid-cols-2">
            <div>
              <Row label="Vendas" value={String(sales.count)} />
              <Row label="Faturamento" value={formatMoeda(sales.revenue)} strong />
              <Row label="Custo" value={formatMoeda(sales.cost)} />
            </div>
            <div>
              <Row
                label="Lucro"
                value={formatMoeda(sales.profit)}
                strong
                tone={sales.profit < 0 ? "negative" : "positive"}
              />
              <Row label="Recebido dessas vendas" value={formatMoeda(sales.received)} tone="positive" />
              <Row label="A receber dessas vendas" value={formatMoeda(sales.receivable)} tone="warning" />
            </div>
          </dl>
          <Link href={salesHref} className="mt-2 inline-flex items-center text-sm text-primary hover:underline">
            Ver vendas <ChevronRight className="h-4 w-4" />
          </Link>
        </Card>
      </Section>

      <Section
        title="Movimento do período"
        description="Dinheiro que entrou e saiu com data dentro do período (movimentações)."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-4">
            <dl>
              <Row label="Entradas" value={formatMoeda(cash.inflow)} strong tone="positive" />
              <Row label="Saídas" value={formatMoeda(cash.outflow)} strong />
              <Row
                label="Saldo do movimento"
                value={formatMoeda(cash.net)}
                strong
                tone={cash.net < 0 ? "negative" : "positive"}
              />
            </dl>
            <div className="mt-2 flex flex-wrap gap-x-4">
              <Link
                href={`/movimentacoes?${movementsParams.toString()}`}
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                Ver movimentações <ChevronRight className="h-4 w-4" />
              </Link>
              <Link href={unallocatedHref} className="inline-flex items-center text-sm text-primary hover:underline">
                Sem alocação <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Por categoria</h3>
            {cash.by_category.length > 0 ? (
              <table className="w-full text-sm">
                <tbody>
                  {cash.by_category.map((c) => (
                    <tr key={c.category} className="border-b last:border-b-0">
                      <td className="py-1.5">{MOVEMENT_CATEGORY_LABELS[c.category] ?? "—"}</td>
                      <td className="py-1.5 text-right tabular-nums">{formatMoeda(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">Nenhuma movimentação no período.</p>
            )}
          </Card>
          <Card className="p-4 md:col-span-2">
            <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
              Recebido por forma de pagamento
            </h3>
            {cash.received_by_method.length > 0 ? (
              <table className="w-full text-sm">
                <tbody>
                  {cash.received_by_method.map((m) => (
                    <tr key={m.payment_method ?? "none"} className="border-b last:border-b-0">
                      <td className="py-1.5">{formatPaymentMethod(m.payment_method)}</td>
                      <td className="py-1.5 text-right tabular-nums">{formatMoeda(m.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">Nenhum recebimento no período.</p>
            )}
          </Card>
        </div>
      </Section>

      <Section
        title="Despesas"
        description="Saídas do período sem quitação de conta (combustível, impostos do mês, manutenção…)."
      >
        <Card className="p-4">
          <dl>
            <Row label="Total de despesas" value={formatMoeda(expenses.total)} strong />
          </dl>
          {expenses.by_category.length > 0 ? (
            <table className="mt-2 w-full text-sm">
              <tbody>
                {expenses.by_category.map((c) => (
                  <tr key={c.category} className="border-b last:border-b-0">
                    <td className="py-1.5">{MOVEMENT_CATEGORY_LABELS[c.category] ?? "—"}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatMoeda(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">Nenhuma despesa no período.</p>
          )}
          <Link
            href={`/movimentacoes?${movementsParams.toString()}&direction=OUT`}
            className="mt-2 inline-flex items-center text-sm text-primary hover:underline"
          >
            Ver saídas <ChevronRight className="h-4 w-4" />
          </Link>
        </Card>
      </Section>

      <Section title="Resultado do período" description="Lucro das vendas do período menos as despesas.">
        <Card className="p-4">
          <dl>
            <Row label="Lucro das vendas" value={formatMoeda(result.sales_profit)} />
            <Row label="Despesas" value={formatMoeda(result.expenses)} />
            <Row
              label="Resultado"
              value={formatMoeda(result.net_result)}
              strong
              tone={result.net_result < 0 ? "negative" : "positive"}
            />
          </dl>
        </Card>
      </Section>

      <Section title="Saldos em aberto (hoje)" description="Não dependem do período escolhido.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BalanceCard label="A receber" value={balances.receivable} href="/contas?direction=RECEIVABLE" />
          <BalanceCard label="A pagar" value={balances.payable} href="/contas?direction=PAYABLE" />
        </div>
        {balances.payable_by_counterparty_kind.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
              A pagar por tipo de credor
            </h3>
            <table className="w-full text-sm">
              <tbody>
                {balances.payable_by_counterparty_kind.map((k) => (
                  <tr key={k.kind} className="border-b last:border-b-0">
                    <td className="py-1.5">{SUPPLIER_KIND_LABELS[k.kind] ?? "—"}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatMoeda(k.open)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </Section>
    </div>
  );
}

export default function FinanceiroPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial = parseFinancePeriod(searchParams.get("from"), searchParams.get("to"));
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  const periodError = validateFinancePeriod({ from, to });
  const { summary, isLoading, error, refresh } = useFinanceSummary(from, to, !periodError);
  const activePreset = useMemo(() => matchFinancePreset({ from, to }), [from, to]);

  // Reflete o período na URL (compartilhável / sobrevive ao recarregar)
  useEffect(() => {
    const params = new URLSearchParams({ from, to });
    router.replace(`/financeiro?${params.toString()}`, { scroll: false });
  }, [from, to, router]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Financeiro</h1>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          {FINANCE_PRESETS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={activePreset === p.value ? "default" : "outline"}
              onClick={() => {
                const period = financePresetPeriod(p.value);
                setFrom(period.from);
                setTo(period.to);
              }}
            >
              {p.label}
            </Button>
          ))}
          <div className="space-y-1">
            <label htmlFor="fin_from" className="text-xs font-medium text-muted-foreground">
              De
            </label>
            <Input
              id="fin_from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 w-36"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="fin_to" className="text-xs font-medium text-muted-foreground">
              Até
            </label>
            <Input
              id="fin_to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 w-36"
            />
          </div>
        </div>
        {periodError && <p className="text-xs text-destructive">{periodError}</p>}
        <p className="text-sm text-muted-foreground">
          <strong>Vendas do período</strong> usam a data da venda (competência);{" "}
          <strong>movimento</strong>, <strong>despesas</strong> e <strong>resultado</strong> usam as datas das movimentações; os{" "}
          <strong>saldos em aberto</strong> são de hoje.
        </p>
      </div>

      {periodError ? null : isLoading ? (
        <SummarySkeleton />
      ) : error || !summary ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="text-destructive">
            {error instanceof Error ? error.message : "Erro ao carregar o painel financeiro."}
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refresh()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <SummaryView summary={summary} from={from} to={to} />
      )}
    </div>
  );
}
