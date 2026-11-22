"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateField, FieldShell } from "@/components/patterns/fields";
import { MoneyText } from "@/components/patterns/values";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { initialPlanState, resolvePlan } from "@/components/entity/installment-plan";
import { formatMoney, formatPercent, todayISO } from "@/lib/format";
import { isApiError } from "@/lib/errors";
import type { ClosingRequest, ClosingResponse } from "@/lib/types";
import {
  SECTION_LABELS,
  buildClosing,
  closingErrorTarget,
  closingTotals,
  defaultItemState,
  validateClosing,
  type ClosingItem,
  type ClosingSection,
  type ClosingState,
} from "../model";
import { useClosingLookups } from "../queries";
import { ClosingCostsSection } from "./ClosingCostsSection";
import { ClosingItemsSection } from "./ClosingItemsSection";
import { ClosingReceivableSection } from "./ClosingReceivableSection";

export interface CloseSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "Orçamento nº 154 · Alejandra". */
  heading: string;
  items: ClosingItem[];
  /** Cobranças ao cliente (frete cobrado) que já compõem o preço. */
  chargesTotal: number;
  /** Envia o `closing` (conversão ou venda rápida); `undefined` = falhou (o erro vem em `error`). */
  submit: (closing: ClosingRequest) => Promise<ClosingResponse | undefined>;
  pending: boolean;
  error: unknown;
  onClosed: (result: ClosingResponse) => void;
}

/**
 * Fechar venda (T05, C5): UMA chamada atômica — ou fecha tudo, ou nada muda e o erro aponta a
 * seção. Tudo é opcional: o dono pode só confirmar. Usado pela conversão e pela venda rápida.
 */
export function CloseSaleDialog(props: CloseSaleDialogProps) {
  // O corpo monta ao abrir: cada abertura começa do padrão, sem efeito de reset.
  return props.open ? <CloseSaleForm {...props} /> : null;
}

function Section({ n, id, title, error, children }: { n: number; id: ClosingSection; title: string; error?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`closing-${id}`} className="space-y-3">
      <h3 id={`closing-${id}`} className="text-sm font-semibold">
        <span aria-hidden>{["①", "②", "③", "④"][n - 1]} </span>
        {title}
      </h3>
      {error && (
        <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {children}
    </section>
  );
}

function CloseSaleForm({ onOpenChange, heading, items, chargesTotal, submit, pending, error, onClosed }: CloseSaleDialogProps) {
  const today = todayISO();
  const { defaultSuppliers, balances } = useClosingLookups(true);
  const [state, setState] = useState<ClosingState>(() => ({
    items: items.map(defaultItemState),
    deliveryDate: "",
    plan: initialPlanState(today),
    receivedNow: false,
    method: "",
    costs: [],
  }));
  const [localError, setLocalError] = useState<{ section: ClosingSection; message: string } | null>(null);

  const totals = closingTotals(items, chargesTotal, state.costs);
  const lines = resolvePlan(state.plan, totals.price, today);
  const target = closingErrorTarget(isApiError(error) ? error.field : undefined);
  const serverMessage = isApiError(error) ? error.message : null;

  const sectionError = (s: ClosingSection) =>
    localError?.section === s ? localError.message : target?.section === s ? (serverMessage ?? undefined) : undefined;
  const generic = serverMessage && !target ? serverMessage : null;

  const set = (patch: Partial<ClosingState>) => {
    setLocalError(null);
    setState((s) => ({ ...s, ...patch }));
  };

  async function confirm() {
    const invalid = validateClosing(state, totals.price, today);
    setLocalError(invalid);
    if (invalid) {
      document.getElementById(`closing-${invalid.section}`)?.scrollIntoView({ block: "center" });
      return;
    }
    const result = await submit(buildClosing(items, state, totals.price, today, defaultSuppliers));
    if (result) onClosed(result);
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={onOpenChange}
      title="Fechar venda"
      description={`${heading} · ${formatMoney(totals.price)}`}
      size="xl"
      dismissible={!pending}
      footer={
        <>
          <p className="flex flex-1 flex-wrap items-baseline gap-x-2 text-sm md:self-center" aria-live="polite">
            <span className="text-muted-foreground">Lucro previsto</span>
            <strong><MoneyText value={totals.profit} /></strong>
            <span className="text-muted-foreground">({formatPercent(totals.margin)})</span>
          </p>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Voltar
          </Button>
          <Button type="button" onClick={confirm} disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Fechar venda
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {generic && (
          <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
            {generic}
          </p>
        )}

        <Section n={1} id="items" title={SECTION_LABELS.items} error={sectionError("items")}>
          <ClosingItemsSection
            items={items}
            states={state.items}
            defaults={defaultSuppliers}
            balances={balances}
            errorIndex={target?.section === "items" ? target.index : undefined}
            onChange={(i, patch) => set({ items: state.items.map((s, j) => (j === i ? { ...s, ...patch } : s)) })}
          />
        </Section>

        <Section n={2} id="delivery" title={SECTION_LABELS.delivery} error={sectionError("delivery")}>
          <FieldShell label="Prazo de entrega" htmlFor="closing-delivery">
            <DateField id="closing-delivery" value={state.deliveryDate} onChange={(v) => set({ deliveryDate: v })} />
          </FieldShell>
        </Section>

        <Section n={3} id="receivable" title={SECTION_LABELS.receivable} error={sectionError("receivable")}>
          <ClosingReceivableSection
            total={totals.price}
            today={today}
            plan={state.plan}
            onPlanChange={(plan) => set({ plan })}
            receivedNow={state.receivedNow}
            method={state.method}
            firstAmount={lines[0]?.amount ?? null}
            onReceivedNowChange={(receivedNow) => set({ receivedNow })}
            onMethodChange={(method) => set({ method })}
          />
        </Section>

        <Section n={4} id="costs" title={`${SECTION_LABELS.costs} (opcional)`} error={sectionError("costs")}>
          <ClosingCostsSection
            costs={state.costs}
            errorIndex={target?.section === "costs" ? target.index : undefined}
            onChange={(costs) => set({ costs })}
          />
        </Section>
      </div>
    </ResponsiveDialog>
  );
}
