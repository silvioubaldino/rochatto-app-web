"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBack } from "@/lib/history";
import { MoneyText } from "./values";
import { TONE_SUBTLE_CLASSES, type Tone } from "@/lib/format";
import type { StateAction } from "./states";

/**
 * Esqueleto de página de detalhe (UX-P07): cabeçalho com status e UMA ação principal,
 * próximo passo, seções + resumo fixo, barra de ação fixa no celular.
 *
 * ```tsx
 * <DetailLayout
 *   header={<PageHeader title="Venda nº 98 · Alejandra" backFallback="/vendas" backLabel="Vendas" badges={…} actions={…} />}
 *   nextStep={<NextStepBanner step={nextStep(sale)} />}
 *   aside={<SummaryAside rows={…} />}
 *   actionBar={<ActionBar primary={…} />}>
 *   …seções…
 * </DetailLayout>
 * ```
 */
export function DetailLayout({
  header,
  nextStep,
  aside,
  actionBar,
  children,
  className,
}: {
  header: ReactNode;
  nextStep?: ReactNode;
  /** Resumo (SummaryAside): fixo ao lado no desktop, recolhível no topo no celular. */
  aside?: ReactNode;
  /** Barra de ação fixa embaixo no celular (ActionBar). */
  actionBar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl space-y-4", className)}>
      {header}
      {nextStep}
      <div className={cn("grid grid-cols-1 gap-4", aside && "lg:grid-cols-[minmax(0,1fr)_20rem]")}>
        {aside && <div className="lg:order-2 lg:self-start lg:sticky lg:top-4">{aside}</div>}
        <div className="min-w-0 space-y-4 lg:order-1">{children}</div>
      </div>
      {actionBar}
    </div>
  );
}

export interface PageHeaderProps {
  title: string;
  /** Linha de contexto sob o título ("Bonito/MS · indicado por Arq. Paula"). */
  subtitle?: ReactNode;
  /** Status como badges (StatusBadge). */
  badges?: ReactNode;
  /** Rota da lista de origem, usada quando não há tela anterior do app (F08). */
  backFallback: string;
  /** Rótulo da trilha: "Vendas" → `‹ Vendas`. */
  backLabel?: string;
  /** A ação principal do cabeçalho (desktop). As demais vão em `menu`. */
  actions?: ReactNode;
  /** Menu "⋯" com as ações secundárias (sempre visível no celular — sem hover). */
  menu?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  badges,
  backFallback,
  backLabel = "Voltar",
  actions,
  menu,
  className,
}: PageHeaderProps) {
  const back = useBack(backFallback);
  return (
    <header className={cn("space-y-2", className)}>
      <Button type="button" variant="ghost" size="sm" onClick={back} className="-ml-2">
        <ArrowLeft aria-hidden />
        {backLabel}
      </Button>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-64">
          <h1 className="text-xl font-bold md:text-2xl">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {badges && <div className="flex flex-wrap items-center gap-1.5">{badges}</div>}
        <div className="flex items-center gap-2">
          <div className="max-md:hidden">{actions}</div>
          {menu}
        </div>
      </div>
    </header>
  );
}

export interface NextStep {
  title: string;
  description?: string;
  action: StateAction;
  tone?: Tone;
}

/** Próximo passo do detalhe (UX-2): o que falta + o botão que resolve. `null` = nada pendente. */
export function NextStepBanner({ step }: { step: NextStep | null | undefined }) {
  if (!step) return null;
  const tone = step.tone ?? "warning";
  return (
    <section
      aria-label="Próximo passo"
      className={cn("flex flex-wrap items-center gap-3 rounded-lg px-4 py-3", TONE_SUBTLE_CLASSES[tone])}
    >
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-medium">{step.title}</p>
        {step.description && <p className="text-sm opacity-90">{step.description}</p>}
      </div>
      {step.action.href ? (
        <Link href={step.action.href} className={buttonVariants()}>
          {step.action.label}
          <ChevronRight aria-hidden />
        </Link>
      ) : (
        <Button onClick={step.action.onClick}>{step.action.label}</Button>
      )}
    </section>
  );
}

export interface SummaryRow {
  label: string;
  /** Dinheiro (`MoneyText`) ou nó livre. */
  value: number | ReactNode;
  tone?: Tone;
  /** Linha de destaque (total). */
  strong?: boolean;
}

/**
 * Resumo fixo (UX-P07): cada número aparece UMA vez aqui. No celular é um bloco recolhível
 * no topo, sem ocupar a tela.
 */
export function SummaryAside({
  title = "Resumo",
  rows,
  children,
  collapsibleOnPhone = true,
}: {
  title?: string;
  rows: readonly SummaryRow[];
  /** Ações do resumo (Receber…). */
  children?: ReactNode;
  collapsibleOnPhone?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <aside aria-label={title} className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {collapsibleOnPhone && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="md:hidden"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Recolher" : "Mostrar"}
          </Button>
        )}
      </div>
      <div className={cn("mt-3 space-y-3", collapsibleOnPhone && !open && "max-md:hidden")}>
        <dl className="space-y-2 text-sm">
          {rows.map((r) => (
            <div key={r.label} className={cn("flex items-baseline justify-between gap-3", r.strong && "font-semibold")}>
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd>{typeof r.value === "number" ? <MoneyText value={r.value} tone={r.tone} /> : r.value}</dd>
            </div>
          ))}
        </dl>
        {children}
      </div>
    </aside>
  );
}

/**
 * Barra de ação FIXA embaixo no celular (UX-P13): a ação principal ao alcance do polegar,
 * colada acima da barra de navegação (o AppShell reserva a barra fora da área de rolagem)
 * e da área segura. No desktop é uma linha comum.
 */
export function ActionBar({
  primary,
  secondary,
  className,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 md:flex-row md:justify-end",
        "max-md:sticky max-md:bottom-0 max-md:z-30 max-md:-mx-4 max-md:border-t max-md:bg-background max-md:px-4 max-md:py-3 max-md:pb-safe",
        className,
      )}
    >
      {secondary}
      {primary}
    </div>
  );
}
