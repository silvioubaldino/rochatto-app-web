"use client";

import { useId, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FINANCE_PRESETS, financePresetPeriod, matchFinancePreset, type FinancePeriod } from "@/lib/finance";

export interface PeriodSelectorProps {
  period: FinancePeriod;
  onChange: (period: FinancePeriod) => void;
  className?: string;
}

export function PeriodSelector({ period, onChange, className }: PeriodSelectorProps) {
  const uid = useId();
  const active = useMemo(() => matchFinancePreset(period), [period]);
  return (
    <div className={cn("flex flex-wrap items-end gap-2", className)}>
      <div role="group" aria-label="Atalhos de período" className="flex flex-wrap gap-2">
        {FINANCE_PRESETS.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant={active === p.value ? "default" : "outline"}
            aria-pressed={active === p.value}
            onClick={() => onChange(financePresetPeriod(p.value))}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${uid}-from`} className="text-xs text-muted-foreground">
          De
        </Label>
        <Input
          id={`${uid}-from`}
          type="date"
          value={period.from}
          onChange={(e) => onChange({ ...period, from: e.target.value })}
          className="md:w-36"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${uid}-to`} className="text-xs text-muted-foreground">
          Até
        </Label>
        <Input
          id={`${uid}-to`}
          type="date"
          value={period.to}
          onChange={(e) => onChange({ ...period, to: e.target.value })}
          className="md:w-36"
        />
      </div>
    </div>
  );
}
