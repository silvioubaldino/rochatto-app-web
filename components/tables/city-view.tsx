"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CityOption } from "@/lib/customer-city";

/** Controles "Cidade" + "Agrupar por cidade" para a barra de filtros (SPEC-012). */
export function CityControls({
  cidade,
  onCidadeChange,
  options,
  grouped,
  onGroupedChange,
  groupCount,
  allCollapsed,
  onToggleAll,
}: {
  cidade: string;
  onCidadeChange: (v: string) => void;
  options: CityOption[];
  grouped: boolean;
  onGroupedChange: (v: boolean) => void;
  groupCount: number;
  allCollapsed: boolean;
  onToggleAll: () => void;
}) {
  return (
    <>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Cidade</label>
        <select
          value={cidade}
          onChange={(e) => onCidadeChange(e.target.value)}
          className="h-8 max-w-48 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todas</option>
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label} ({o.count})
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-2">
        <Button
          variant={grouped ? "secondary" : "outline"}
          size="sm"
          className="h-8"
          aria-pressed={grouped}
          onClick={() => onGroupedChange(!grouped)}
        >
          <Layers className="h-4 w-4" />
          Agrupar por cidade
        </Button>
        {grouped && groupCount > 1 && (
          <Button variant="ghost" size="sm" className="h-8" onClick={onToggleAll}>
            {allCollapsed ? "Expandir tudo" : "Recolher tudo"}
          </Button>
        )}
      </div>
    </>
  );
}

/** Botão do cabeçalho do grupo: chevron, cidade e contagem. Vai dentro de uma `<td>`. */
export function CityGroupToggle({
  label,
  count,
  noun,
  open,
  onToggle,
}: {
  label: string;
  count: number;
  noun: [singular: string, plural: string];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-muted"
    >
      {open ? (
        <ChevronDown className="h-4 w-4 shrink-0" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0" />
      )}
      <span className="font-semibold">{label}</span>
      <span className="text-xs text-muted-foreground">
        {count} {count === 1 ? noun[0] : noun[1]}
      </span>
    </button>
  );
}

/** Nome do Customer com a cidade embaixo (quando houver). */
export function CustomerWithCity({ name, city }: { name: ReactNode; city: string | null }) {
  return (
    <div>
      <p>{name}</p>
      {city && <p className="text-xs text-muted-foreground">{city}</p>}
    </div>
  );
}
