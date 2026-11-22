"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import { MoneyField } from "@/components/patterns/fields";
import { Select } from "@/components/patterns/Select";
import { SALE_COST_KINDS, SALE_COST_KIND_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SaleCostKind } from "@/lib/types";
import type { ClosingCostDraft } from "../model";

let counter = 0;

export function ClosingCostsSection({
  costs,
  errorIndex,
  onChange,
}: {
  costs: readonly ClosingCostDraft[];
  errorIndex?: number;
  onChange: (costs: ClosingCostDraft[]) => void;
}) {
  const patch = (key: string, part: Partial<ClosingCostDraft>) =>
    onChange(costs.map((c) => (c.key === key ? { ...c, ...part } : c)));
  return (
    <div className="space-y-3">
      {costs.map((c, i) => (
        <div key={c.key} className={cn("space-y-2 rounded-lg border p-3", errorIndex === i && "border-danger")}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[11rem_9rem_1fr_auto] sm:items-center">
            <Select
              aria-label="Tipo do custo"
              value={c.kind}
              onChange={(v) => patch(c.key, { kind: v as SaleCostKind, payeeId: "" })}
              options={SALE_COST_KINDS.map((k) => ({ value: k, label: SALE_COST_KIND_LABELS[k] }))}
            />
            <MoneyField aria-label="Valor do custo" value={c.amount} onChange={(v) => patch(c.key, { amount: v })} />
            {c.kind === "COMMISSION" ? (
              <EntityCombobox kind="partner" aria-label="Credor do custo" value={c.payeeId} placeholder="Credor (parceiro)" onChange={(id) => patch(c.key, { payeeId: id })} />
            ) : (
              <EntityCombobox
                kind="supplier"
                aria-label="Credor do custo"
                value={c.payeeId}
                placeholder="Credor (a definir)"
                prefer={(f) => (c.kind === "FREIGHT" ? f.kind === "TRANSPORT" : c.kind === "LABOR" ? f.kind === "LABOR" : false)}
                onChange={(id) => patch(c.key, { payeeId: id })}
              />
            )}
            <Button type="button" variant="ghost" size="icon" aria-label="Remover custo" onClick={() => onChange(costs.filter((x) => x.key !== c.key))}>
              <Trash2 className="text-danger" aria-hidden />
            </Button>
          </div>
          <Input aria-label="Descrição do custo" placeholder="Descrição (opcional)" value={c.description} onChange={(e) => patch(c.key, { description: e.target.value })} />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...costs, { key: `cost-${++counter}`, kind: "FREIGHT", amount: 0, payeeId: "", description: "" }])}
      >
        <Plus aria-hidden />
        {costs.length === 0 ? "Frete pago ou outro custo" : "Custo"}
      </Button>
    </div>
  );
}
