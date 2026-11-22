"use client";

import { useMemo } from "react";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/patterns/Select";
import { FieldShell } from "@/components/patterns/fields";
import {
  NO_CITY,
  buildCityIndex,
  cityLabel,
  cityOptions,
  customerCityKey,
} from "@/lib/customer-city";
import { useAllCustomers } from "./entity-queries";

/** Parâmetros de URL da cidade (SPEC-012): somem do filtro quando vazios. */
export const CITY_FILTER_SPEC = { cidade: {}, agrupar: {} } as const;

/**
 * Cidade do Customer (a lista da Sale/Quote não a traz): filtro e agrupamento sobre linhas já
 * carregadas. O estado vem da URL (`cidade`, `agrupar=cidade`), passado pela página.
 */
export function useCityView<T>(
  rows: readonly T[],
  getCustomerId: (row: T) => string,
  state: { cidade: string; agrupar: string },
) {
  const { customers, isLoading } = useAllCustomers();
  const index = useMemo(() => buildCityIndex(customers), [customers]);
  const grouped = state.agrupar === "cidade";
  const options = useMemo(
    () => cityOptions([...rows], getCustomerId, index, state.cidade),
    [rows, getCustomerId, index, state.cidade],
  );
  const visible = useMemo(
    () => (state.cidade ? rows.filter((r) => customerCityKey(getCustomerId(r), index) === state.cidade) : rows),
    [rows, getCustomerId, index, state.cidade],
  );
  return {
    visible,
    options,
    grouped,
    /** Enquanto os clientes carregam, filtro e agrupamento ainda não são confiáveis. */
    loading: (grouped || state.cidade !== "") && isLoading,
    /** Cidade da linha, ou null quando redundante (agrupado/filtrado) ou sem cidade. */
    rowCity: (row: T): string | null => {
      if (grouped || state.cidade) return null;
      const key = customerCityKey(getCustomerId(row), index);
      return key === NO_CITY ? null : cityLabel(key, index);
    },
    groupKey: (row: T) => customerCityKey(getCustomerId(row), index),
    groupLabel: (key: string) => cityLabel(key, index),
  };
}

/** Filtro de cidade + "Agrupar por cidade" para o painel de filtros avançados. */
export function CityFilters({
  cidade,
  agrupar,
  options,
  onChange,
}: {
  cidade: string;
  agrupar: string;
  options: { key: string; label: string; count: number }[];
  onChange: (patch: { cidade?: string; agrupar?: string }) => void;
}) {
  const grouped = agrupar === "cidade";
  return (
    <>
      <FieldShell label="Cidade" htmlFor="filter-city">
        <Select
          id="filter-city"
          value={cidade}
          onChange={(v) => onChange({ cidade: v })}
          options={[{ value: "", label: "Todas" }, ...options.map((o) => ({ value: o.key, label: `${o.label} (${o.count})` }))]}
        />
      </FieldShell>
      <div className="flex items-end">
        <Button type="button" variant={grouped ? "secondary" : "outline"} aria-pressed={grouped} onClick={() => onChange({ agrupar: grouped ? "" : "cidade" })}>
          <Layers aria-hidden />
          Agrupar por cidade
        </Button>
      </div>
    </>
  );
}
