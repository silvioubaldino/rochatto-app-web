"use client";

import { Plus, Trash2 } from "lucide-react";
import { SALE_CHARGE_KINDS, SALE_CHARGE_KIND_LABELS } from "@/lib/formatters";
import type { SaleChargeKind } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/MoneyInput";

export interface ChargeDraft {
  id?: string;
  kind: SaleChargeKind;
  amount: number;
  description: string;
}

interface ChargesEditorProps {
  value: ChargeDraft[];
  onChange: (next: ChargeDraft[]) => void;
}

const selectClass = "h-8 w-full rounded-md border border-input bg-background px-2 text-sm";

/** Lista editável de cobranças ao cliente do Quote (frete cobrado, outras — AYD-009). */
export function ChargesEditor({ value, onChange }: ChargesEditorProps) {
  function patch(index: number, part: Partial<ChargeDraft>) {
    onChange(value.map((c, i) => (i === index ? { ...c, ...part } : c)));
  }

  return (
    <div className="space-y-2">
      {value.map((c, index) => (
        <div
          key={c.id ?? index}
          className="grid grid-cols-1 gap-2 sm:grid-cols-[150px_120px_1fr_32px] sm:items-center"
        >
          <select
            aria-label="Tipo da cobrança"
            value={c.kind}
            onChange={(e) => patch(index, { kind: e.target.value as SaleChargeKind })}
            className={selectClass}
          >
            {SALE_CHARGE_KINDS.map((k) => (
              <option key={k} value={k}>
                {SALE_CHARGE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
          <MoneyInput
            value={c.amount}
            onChange={(v) => patch(index, { amount: v })}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Descrição (opcional)"
            value={c.description}
            onChange={(e) => patch(index, { description: e.target.value })}
            className="h-8 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title="Remover cobrança"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...value, { kind: "FREIGHT", amount: 0, description: "" }])}
      >
        <Plus className="h-3.5 w-3.5" />
        Frete cobrado / cobrança
      </Button>
    </div>
  );
}

/** Corpo de `charges` do Quote; descarta linhas zeradas (a API recusa amount ≤ 0). */
export function toQuoteChargesPayload(drafts: ChargeDraft[]) {
  return drafts
    .filter((c) => c.amount > 0)
    .map((c) => ({
      ...(c.id ? { id: c.id } : {}),
      kind: c.kind,
      amount: c.amount,
      description: c.description.trim() || null,
    }));
}
