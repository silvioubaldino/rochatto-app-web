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

export const CITY_FILTER_SPEC = { cidade: {}, agrupar: {} } as const;

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
    loading: (grouped || state.cidade !== "") && isLoading,
    rowCity: (row: T): string | null => {
      if (grouped || state.cidade) return null;
      const key = customerCityKey(getCustomerId(row), index);
      return key === NO_CITY ? null : cityLabel(key, index);
    },
    groupKey: (row: T) => customerCityKey(getCustomerId(row), index),
    groupLabel: (key: string) => cityLabel(key, index),
  };
}

export function CityFilter({
  cidade,
  options,
  onChange,
}: {
  cidade: string;
  options: { key: string; label: string; count: number }[];
  onChange: (cidade: string) => void;
}) {
  return (
    <FieldShell label="Cidade" htmlFor="filter-city">
      <Select
        id="filter-city"
        value={cidade}
        onChange={onChange}
        options={[{ value: "", label: "Todas" }, ...options.map((o) => ({ value: o.key, label: `${o.label} (${o.count})` }))]}
      />
    </FieldShell>
  );
}

export function CityGroupToggle({ agrupar, onChange }: { agrupar: string; onChange: (agrupar: string) => void }) {
  const grouped = agrupar === "cidade";
  return (
    <Button type="button" variant={grouped ? "secondary" : "outline"} aria-pressed={grouped} onClick={() => onChange(grouped ? "" : "cidade")}>
      <Layers aria-hidden />
      Agrupar por cidade
    </Button>
  );
}
