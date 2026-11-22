"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseFinancePeriod, validateFinancePeriod, type FinancePeriod } from "@/lib/finance";

/**
 * Período (`?from=&to=`) guardado na URL — o MESMO para Indicadores, Resultado e listas (UX-5, T14):
 * recarregar, voltar e compartilhar mantêm o período. Sem parâmetros vale o mês corrente.
 */
export function useUrlPeriod() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const from = params.get("from");
  const to = params.get("to");
  const period = useMemo<FinancePeriod>(() => parseFinancePeriod(from, to), [from, to]);
  const error = validateFinancePeriod(period);

  const setPeriod = useCallback(
    (next: FinancePeriod) => {
      const query = new URLSearchParams(params.toString());
      query.set("from", next.from);
      query.set("to", next.to);
      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  return { period, setPeriod, error };
}
