"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api, APIError } from "@/lib/api";
import { formatMoeda, SALE_CHARGE_KIND_LABELS } from "@/lib/formatters";
import type { Quote } from "@/lib/types";
import { ChargesEditor, toQuoteChargesPayload, type ChargeDraft } from "@/components/sales/ChargesEditor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface QuoteChargesCardProps {
  quote: Quote;
  editable: boolean;
  onChanged: () => void;
}

function toDrafts(quote: Quote): ChargeDraft[] {
  return (quote.charges ?? []).map((c) => ({
    id: c.id,
    kind: c.kind,
    amount: c.amount,
    description: c.description ?? "",
  }));
}

/** Cobranças ao cliente do Quote (frete cobrado — AYD-009); editáveis só com o Quote aberto. */
export function QuoteChargesCard({ quote, editable, onChanged }: QuoteChargesCardProps) {
  const [drafts, setDrafts] = useState<ChargeDraft[]>(() => toDrafts(quote));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDrafts(toDrafts(quote));
  }, [quote]);

  const charges = quote.charges ?? [];
  if (!editable && charges.length === 0) return null;

  async function save() {
    setSaving(true);
    try {
      await api.put(`/quotes/${quote.id}`, {
        notes: quote.notes ?? null,
        charges: toQuoteChargesPayload(drafts),
      });
      toast.success("Cobranças atualizadas.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao salvar cobranças.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <h2 className="text-sm font-semibold uppercase text-muted-foreground">
        Frete cobrado e outras cobranças
      </h2>
      {editable ? (
        <>
          <ChargesEditor value={drafts} onChange={setDrafts} />
          <Button size="sm" onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Salvar cobranças
          </Button>
        </>
      ) : (
        <ul className="space-y-1 text-sm">
          {charges.map((c) => (
            <li key={c.id} className="flex justify-between">
              <span>
                {SALE_CHARGE_KIND_LABELS[c.kind]}
                {c.description ? <span className="text-muted-foreground"> — {c.description}</span> : null}
              </span>
              <span>{formatMoeda(c.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
