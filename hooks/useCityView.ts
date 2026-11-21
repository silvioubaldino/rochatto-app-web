"use client";

import { useMemo, useState } from "react";
import { useClientes } from "@/hooks/useClientes";
import {
  buildCityIndex,
  cityLabel,
  cityOptions,
  customerCityKey,
  groupByCity,
  NO_CITY,
} from "@/lib/customer-city";

/**
 * Filtro e agrupamento por cidade do Customer sobre uma lista já carregada (SPEC-012).
 * A página lê/escreve `cidade`/`grouped` na URL (`?cidade=`, `?agrupar=cidade`).
 */
export function useCityView<T>(
  rows: T[],
  getCustomerId: (row: T) => string,
  initial: { cidade: string; grouped: boolean },
) {
  const [cidade, setCidade] = useState(initial.cidade);
  const [grouped, setGrouped] = useState(initial.grouped);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  // Todos os Customers (GET /clientes, sem paginação) → cidade por id do Customer.
  const { clientes, isLoading: clientesLoading } = useClientes();
  const index = useMemo(() => buildCityIndex(clientes), [clientes]);

  // Opções contam as linhas dos demais filtros (antes do filtro de cidade).
  const options = useMemo(
    () => cityOptions(rows, getCustomerId, index, cidade),
    [rows, getCustomerId, index, cidade],
  );
  const visible = useMemo(
    () =>
      cidade ? rows.filter((r) => customerCityKey(getCustomerId(r), index) === cidade) : rows,
    [rows, getCustomerId, index, cidade],
  );
  const groups = useMemo(
    () => (grouped ? groupByCity(visible, getCustomerId, index) : []),
    [grouped, visible, getCustomerId, index],
  );
  const allCollapsed = groups.length > 0 && groups.every((g) => collapsed.has(g.key));

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setCollapsed(allCollapsed ? new Set() : new Set(groups.map((g) => g.key)));
  }

  /** Cidade da linha, ou null quando seria redundante (agrupado/filtrado) ou não há cidade. */
  function rowCity(row: T): string | null {
    if (grouped || cidade) return null;
    const key = customerCityKey(getCustomerId(row), index);
    return key === NO_CITY ? null : cityLabel(key, index);
  }

  return {
    cidade,
    setCidade,
    grouped,
    setGrouped,
    options,
    visible,
    groups,
    isOpen: (key: string) => !collapsed.has(key),
    toggleGroup,
    toggleAll,
    allCollapsed,
    rowCity,
    /** Enquanto os Customers carregam, filtro/agrupamento ainda não são confiáveis. */
    loading: (grouped || cidade !== "") && clientesLoading,
  };
}
