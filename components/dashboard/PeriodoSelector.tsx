"use client";

import { useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  format,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PeriodoPreset =
  | "mes_atual"
  | "mes_anterior"
  | "ultimos_3_meses"
  | "ano_atual"
  | "personalizado";

interface PeriodoSelectorProps {
  dataInicio: string;
  dataFim: string;
  onChange: (inicio: string, fim: string) => void;
}

function toISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

const PRESETS: { value: PeriodoPreset; label: string }[] = [
  { value: "mes_atual", label: "Mês Atual" },
  { value: "mes_anterior", label: "Mês Anterior" },
  { value: "ultimos_3_meses", label: "Últimos 3 Meses" },
  { value: "ano_atual", label: "Ano Atual" },
  { value: "personalizado", label: "Personalizado" },
];

export function getDefaultPeriodo(): { inicio: string; fim: string } {
  const now = new Date();
  return {
    inicio: toISO(startOfMonth(now)),
    fim: toISO(endOfMonth(now)),
  };
}

export function PeriodoSelector({
  dataInicio,
  dataFim,
  onChange,
}: PeriodoSelectorProps) {
  const [preset, setPreset] = useState<PeriodoPreset>("mes_atual");

  function handlePreset(value: PeriodoPreset) {
    setPreset(value);
    const now = new Date();
    if (value === "mes_atual") {
      onChange(toISO(startOfMonth(now)), toISO(endOfMonth(now)));
    } else if (value === "mes_anterior") {
      const prev = subMonths(now, 1);
      onChange(toISO(startOfMonth(prev)), toISO(endOfMonth(prev)));
    } else if (value === "ultimos_3_meses") {
      onChange(toISO(startOfMonth(subMonths(now, 2))), toISO(endOfMonth(now)));
    } else if (value === "ano_atual") {
      onChange(toISO(startOfYear(now)), toISO(endOfYear(now)));
    }
    // personalizado: não muda datas, usuário edita manualmente
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <Button
          key={p.value}
          size="sm"
          variant={preset === p.value ? "default" : "outline"}
          onClick={() => handlePreset(p.value)}
        >
          {p.label}
        </Button>
      ))}

      {preset === "personalizado" && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Label className="text-xs whitespace-nowrap">De</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => onChange(e.target.value, dataFim)}
              className="h-8 text-sm w-36"
            />
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-xs whitespace-nowrap">Até</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => onChange(dataInicio, e.target.value)}
              className="h-8 text-sm w-36"
            />
          </div>
        </div>
      )}
    </div>
  );
}
