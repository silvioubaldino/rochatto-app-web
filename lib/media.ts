"use client";

import { useSyncExternalStore } from "react";

/** Ponto de corte `md` do Tailwind (celular < 768 px). */
export const PHONE_QUERY = "(max-width: 767.98px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Está no celular (< `md`)? Só para decisões que CSS não resolve (cartões × tabela).
 * No servidor e na hidratação devolve `false` (layout de tela larga) e corrige no cliente.
 */
export function useIsPhone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
}
