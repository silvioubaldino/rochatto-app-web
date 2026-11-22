"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  applyFilterPatch,
  clearPatch,
  countActiveFilters,
  parseFilters,
  withQuery,
  type FilterSpec,
  type FilterValues,
} from "./url-filters-model";

/**
 * Filtros de lista na URL (UX-6): sobrevivem a recarregar, voltar e compartilhar.
 *
 * ```ts
 * const filters = useUrlFilters({ status: {}, q: {}, from: {}, to: {} });
 * filters.values.status; filters.set({ status: "OPEN" }); filters.clear();
 * ```
 * Escreve com `router.replace` (filtrar não empilha histórico). Passe `spec` ESTÁVEL
 * (constante de módulo) — ele é dependência do hook.
 */
export function useUrlFilters<S extends FilterSpec>(spec: S, options: { keep?: readonly string[] } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const keep = options.keep;

  const values = useMemo(() => parseFilters(spec, params), [spec, params]);

  const set = useCallback(
    (patch: Partial<FilterValues<S>>) => {
      const query = applyFilterPatch(spec, new URLSearchParams(params.toString()), patch);
      router.replace(withQuery(pathname, query), { scroll: false });
    },
    [spec, params, pathname, router],
  );

  const clear = useCallback(() => set(clearPatch(spec, keep)), [set, spec, keep]);

  return {
    values,
    set,
    clear,
    activeCount: countActiveFilters(spec, values, keep),
  };
}
