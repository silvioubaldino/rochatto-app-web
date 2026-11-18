"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FINANCE_PRESETS,
  financePresetPeriod,
  matchFinancePreset,
  type FinancePeriod,
} from "@/lib/finance";

// Mesmos atalhos de período do painel Financeiro (lib/finance.ts) — AYD-005.

interface PeriodSelectorProps {
  period: FinancePeriod;
  onChange: (period: FinancePeriod) => void;
}

export function PeriodSelector({ period, onChange }: PeriodSelectorProps) {
  const activePreset = useMemo(() => matchFinancePreset(period), [period]);

  return (
    <div className="flex flex-wrap items-end gap-2">
      {FINANCE_PRESETS.map((p) => (
        <Button
          key={p.value}
          size="sm"
          variant={activePreset === p.value ? "default" : "outline"}
          onClick={() => onChange(financePresetPeriod(p.value))}
        >
          {p.label}
        </Button>
      ))}
      <div className="space-y-1">
        <label htmlFor="dash_from" className="text-xs font-medium text-muted-foreground">
          De
        </label>
        <Input
          id="dash_from"
          type="date"
          value={period.from}
          onChange={(e) => onChange({ ...period, from: e.target.value })}
          className="h-8 w-36"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="dash_to" className="text-xs font-medium text-muted-foreground">
          Até
        </label>
        <Input
          id="dash_to"
          type="date"
          value={period.to}
          onChange={(e) => onChange({ ...period, to: e.target.value })}
          className="h-8 w-36"
        />
      </div>
    </div>
  );
}
