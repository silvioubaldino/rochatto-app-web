"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseTab, tabQuery } from "./url-tab-model";

/**
 * Aba ativa guardada na URL (UX-6, F21): recarregar, voltar e compartilhar mantêm a aba.
 * `allowed` deve ser ESTÁVEL (constante de módulo).
 *
 * ```tsx
 * const [tab, setTab] = useUrlTab(TABS, "produtos");
 * <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
 * ```
 */
export function useUrlTab<T extends string>(allowed: readonly T[], fallback: T, param = "tab") {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = parseTab(params.get(param), allowed, fallback);

  const setTab = useCallback(
    (next: T) => {
      const query = tabQuery(params, param, next, fallback);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, param, fallback, pathname, router],
  );

  return [tab, setTab] as const;
}
