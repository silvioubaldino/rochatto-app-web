"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItemsGrid, fromQuoteItem, gridTotals, type ItemLine } from "@/components/entity/items-grid";
import { useEntityById } from "@/components/entity/entity-queries";
import { ActionBar, PageHeader } from "@/components/patterns/detail";
import { ActionsMenu, type ActionItem } from "@/components/patterns/ActionsMenu";
import { useConfirm } from "@/components/patterns/ConfirmDialog";
import { MoneyText } from "@/components/patterns/values";
import { useUnsavedChangesGuard } from "@/components/patterns/useUnsavedChangesGuard";
import { CloseSaleDialog } from "@/features/closing/components/CloseSaleDialog";
import type { ClosingItem } from "@/features/closing/model";
import { formatPercent, todayISO } from "@/lib/format";
import { useIsPhone } from "@/lib/media";
import type { ClosingResponse, Quote } from "@/lib/types";
import { quoteTitle } from "../model";
import {
  useConvertQuote,
  useCreateQuote,
  useDeleteQuote,
  useDuplicateQuote,
  useQuickSale,
  useSaveQuote,
  useSetQuoteStatus,
} from "../mutations";
import { emptyQuoteForm, formFromQuote, quoteFormSchema, type QuoteFormData } from "../schemas";
import { QuoteCharges } from "./QuoteCharges";
import { QuoteHeaderFields } from "./QuoteHeaderFields";
import { QuoteLostDialog } from "./QuoteLostDialog";

interface QuoteEditorProps {
  /** Orçamento aberto a editar; sem isto, cria um novo. */
  quote?: Quote;
  /** Relê o orçamento (ids dos Items novos) — devolve o registro fresco. */
  refresh?: () => Promise<Quote | undefined>;
  /** `/orcamentos/novo?customer_id=…&rapida=1`. */
  initial?: { customerId?: string; quick?: boolean };
}

/** Editor ÚNICO de orçamento (T03): criar e editar um Quote aberto — mesmo componente. */
export function QuoteEditor({ quote, refresh, initial }: QuoteEditorProps) {
  const router = useRouter();
  const phone = useIsPhone();
  const confirm = useConfirm();
  const today = todayISO();
  const original: ItemLine[] = quote ? (quote.items ?? []).map(fromQuoteItem) : [];

  const { control, handleSubmit, setValue, getValues, reset, formState } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: quote ? formFromQuote(quote, original) : emptyQuoteForm(today, initial?.customerId),
  });
  const { errors, isDirty, isSubmitted, isSubmitting } = formState;
  const [items, charges, customerId] = useWatch({ control, name: ["items", "charges", "customer_id"] });
  const customerName = useEntityById("customer", customerId || null).option?.label ?? "";

  const create = useCreateQuote();
  const save = useSaveQuote(quote?.id ?? "", original);
  const status = useSetQuoteStatus(quote?.id ?? "");
  const remove = useDeleteQuote(quote?.id ?? "");
  const duplicate = useDuplicateQuote();
  const convert = useConvertQuote(quote?.id ?? "");
  const quickSale = useQuickSale();

  const [closing, setClosing] = useState<{ form: QuoteFormData; items: ClosingItem[] } | null>(null);
  const [lostOpen, setLostOpen] = useState(false);
  const closeMutation = quote ? convert : quickSale;

  const { confirmDiscard } = useUnsavedChangesGuard(isDirty && !isSubmitting);
  const totals = gridTotals(items);
  const chargesTotal = charges.reduce((s, c) => s + (c.amount > 0 ? c.amount : 0), 0);
  const busy = isSubmitting || create.pending || save.pending;
  const title = quote ? quoteTitle(quote) : "Novo orçamento";

  async function persist(form: QuoteFormData): Promise<Quote | null | undefined> {
    if (!quote) {
      const created = await create.mutate(form);
      if (created) router.replace(`/orcamentos/${created.id}`);
      return created;
    }
    if (!(await save.mutate(form))) return undefined;
    const fresh = (await refresh?.()) ?? quote;
    reset(formFromQuote(fresh, (fresh.items ?? []).map(fromQuoteItem)));
    return fresh;
  }

  const onSave = handleSubmit(async (form) => void (await persist(form)));

  const onCloseSale = handleSubmit(async (form) => {
    if (!quote) {
      setClosing({ form, items: form.items.map((l, index) => toClosingItem(l, { index })) });
      return;
    }
    let source = quote;
    if (isDirty) {
      const fresh = await persist(form);
      if (!fresh) return;
      source = fresh;
    }
    setClosing({ form, items: (source.items ?? []).map((i) => toClosingItem(fromQuoteItem(i), { quoteItemId: i.id })) });
  });

  async function onClosed(res: ClosingResponse) {
    setClosing(null);
    if (res.warnings?.length) toast.warning(`Estoque insuficiente em ${res.warnings.length} item(ns): o saldo fica negativo.`);
    router.push(`/vendas/${res.sale_id}`);
  }

  const menu: ActionItem[] = quote
    ? [
        {
          id: "duplicate",
          label: "Duplicar",
          onSelect: async () => {
            const copy = await duplicate.mutate(getValues(), today);
            if (copy) router.push(`/orcamentos/${copy.id}`);
          },
        },
        {
          id: "delete",
          label: "Excluir orçamento",
          danger: true,
          onSelect: async () => {
            const ok = await confirm({ title: "Excluir orçamento", description: "O orçamento sai das listas. Isso não afeta nenhuma venda.", confirmLabel: "Excluir", tone: "danger" });
            if (ok && (await remove.mutate()) !== undefined) router.replace("/orcamentos");
          },
        },
      ]
    : [];

  const quickFirst = !quote && initial?.quick;
  const saveButton = (
    <Button type="button" variant={quickFirst || quote ? "outline" : "default"} onClick={onSave} disabled={busy}>
      {busy && <Loader2 className="animate-spin" aria-hidden />}
      {quote ? "Salvar" : "Salvar orçamento"}
    </Button>
  );
  const closeButton = (
    <Button type="button" variant={quickFirst || quote ? "default" : "outline"} onClick={onCloseSale} disabled={busy}>
      {quote ? "Fechar venda" : "Venda rápida"}
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <PageHeader
        title={title}
        subtitle={quote ? customerName : "Preencha e salve, ou feche a venda na hora."}
        backFallback="/orcamentos"
        backLabel="Orçamentos"
        menu={<ActionsMenu items={menu} />}
        actions={phone ? undefined : <div className="flex gap-2">{saveButton}{closeButton}</div>}
      />
      <QuoteHeaderFields control={control} errors={errors} setValue={setValue} getValues={getValues} customerId={customerId} />

      <section aria-labelledby="quote-items" className="space-y-3 rounded-lg border bg-card p-4">
        <h2 id="quote-items" className="text-sm font-semibold">Items</h2>
        <Controller
          control={control}
          name="items"
          render={({ field }) => <ItemsGrid mode="quote" lines={field.value} showErrors={isSubmitted} onChange={(l) => field.onChange(l)} />}
        />
        {errors.items?.message && <p role="alert" className="text-sm text-danger">{errors.items.message}</p>}
      </section>

      <section aria-labelledby="quote-charges" className="space-y-3 rounded-lg border bg-card p-4">
        <h2 id="quote-charges" className="text-sm font-semibold">Frete cobrado e outras cobranças</h2>
        <Controller control={control} name="charges" render={({ field }) => <QuoteCharges value={field.value} onChange={(c) => field.onChange(c)} />} />
        <p className="flex flex-wrap items-baseline justify-end gap-x-4 gap-y-1 border-t pt-3 text-sm">
          <span>Total ao cliente <strong className="text-base"><MoneyText value={totals.revenue + chargesTotal} /></strong></span>
          <span className="text-muted-foreground">Custo estimado <MoneyText value={totals.cost} /></span>
          <span className="text-muted-foreground">Margem estimada {formatPercent(totals.revenue + chargesTotal > 0 ? ((totals.revenue + chargesTotal - totals.cost) / (totals.revenue + chargesTotal)) * 100 : null)}</span>
        </p>
      </section>

      {quote && (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={() => setLostOpen(true)}>Marcar como perdido</Button>
        </div>
      )}

      {phone && <ActionBar primary={quickFirst || quote ? closeButton : saveButton} secondary={quickFirst || quote ? saveButton : closeButton} />}

      <QuoteLostDialog
        open={lostOpen}
        onOpenChange={setLostOpen}
        pending={status.pending}
        onConfirm={async (reason) => {
          if ((await status.mutate("LOST", reason)) !== undefined) setLostOpen(false);
        }}
      />
      <CloseSaleDialog
        open={!!closing}
        onOpenChange={(o) => {
          if (!o) {
            setClosing(null);
            closeMutation.reset();
          }
        }}
        heading={`${title}${customerName ? ` · ${customerName}` : ""}`}
        items={closing?.items ?? []}
        chargesTotal={chargesTotal}
        pending={closeMutation.pending}
        error={closeMutation.error}
        submit={(c) => (quote ? convert.mutate(c) : quickSale.mutate(closing?.form ?? getValues(), c))}
        onClosed={onClosed}
      />
    </div>
  );
}

function toClosingItem(l: ItemLine, ref: ClosingItem["ref"]): ClosingItem {
  return { ref, kind: l.kind, productId: l.productId, name: l.name, unit: l.unit, quantity: l.quantity, unitPrice: l.unitPrice, unitCost: l.unitCost };
}
