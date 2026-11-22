"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyField } from "@/components/patterns/fields";
import { Select } from "@/components/patterns/Select";
import { SALE_CHARGE_KINDS, SALE_CHARGE_KIND_LABELS } from "@/lib/format";
import type { SaleChargeKind } from "@/lib/types";
import type { ChargeDraft } from "../schemas";

/** Cobranças ao cliente (frete cobrado, outras): somam ao preço e viram parte da conta a receber (AYD-009). */
export function QuoteCharges({ value, onChange }: { value: ChargeDraft[]; onChange: (next: ChargeDraft[]) => void }) {
  const patch = (index: number, part: Partial<ChargeDraft>) =>
    onChange(value.map((c, i) => (i === index ? { ...c, ...part } : c)));
  return (
    <div className="space-y-2">
      {value.map((c, i) => (
        <div key={c.id ?? i} className="grid grid-cols-1 gap-2 sm:grid-cols-[11rem_9rem_1fr_auto] sm:items-center">
          <Select
            aria-label="Tipo da cobrança"
            value={c.kind}
            onChange={(v) => patch(i, { kind: v as SaleChargeKind })}
            options={SALE_CHARGE_KINDS.map((k) => ({ value: k, label: SALE_CHARGE_KIND_LABELS[k] }))}
          />
          <MoneyField aria-label="Valor da cobrança" value={c.amount} onChange={(v) => patch(i, { amount: v })} />
          <Input aria-label="Descrição da cobrança" placeholder="Descrição (opcional)" value={c.description} onChange={(e) => patch(i, { description: e.target.value })} />
          <Button type="button" variant="ghost" size="icon" aria-label="Remover cobrança" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <Trash2 className="text-danger" aria-hidden />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { kind: "FREIGHT", amount: 0, description: "" }])}>
        <Plus aria-hidden />
        {value.length === 0 ? "Frete cobrado ou outra cobrança" : "Cobrança"}
      </Button>
    </div>
  );
}
