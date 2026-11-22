"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

// "Voltar" de verdade (UX-P05, F08): histórico do navegador quando a tela anterior é do app;
// senão, a lista de origem. Nunca uma rota fixa que perde filtros e rolagem.

let inAppNavigations = 0;

/** Chamado pelo AppShell a cada mudança de rota dentro do app (a primeira carga não conta). */
export function noteInAppNavigation(): void {
  inAppNavigations += 1;
}

/** Só para testes. */
export function resetInAppNavigations(): void {
  inAppNavigations = 0;
}

/** Há uma tela anterior DO APP no histórico? */
export function canGoBackInApp(count: number = inAppNavigations): boolean {
  return count > 0;
}

/**
 * `const back = useBack("/vendas"); <Button onClick={back} />`.
 * Volta pelo histórico se veio de dentro do app; senão vai para `fallbackHref`.
 */
export function useBack(fallbackHref: string): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (canGoBackInApp()) router.back();
    else router.push(fallbackHref);
  }, [router, fallbackHref]);
}
