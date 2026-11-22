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
