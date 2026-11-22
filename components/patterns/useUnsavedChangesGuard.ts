"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "./ConfirmDialog";
import { isInternalNavigationClick } from "./unsaved-guard-model";

/**
 * Guarda de alterações não salvas (UX-P10, F25): avisa ao fechar/recarregar a aba
 * (`beforeunload`) e ao clicar em qualquer link interno (menu, voltar do cabeçalho…) com o
 * formulário sujo. Para botões programáticos ("Cancelar") use o `confirmDiscard` devolvido.
 *
 * ```ts
 * const { confirmDiscard } = useUnsavedChangesGuard(formState.isDirty && !saving);
 * ```
 * Limitação conhecida: o "voltar" do navegador (popstate) não é interceptável no App Router.
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const router = useRouter();
  const confirm = useConfirm();
  const dirtyRef = useRef(dirty);
  const confirmRef = useRef(confirm);

  useEffect(() => {
    dirtyRef.current = dirty;
    confirmRef.current = confirm;
  });

  const confirmDiscard = useCallback(async (): Promise<boolean> => {
    if (!dirtyRef.current) return true;
    return confirmRef.current({
      title: "Descartar alterações?",
      description: "O que você digitou ainda não foi salvo e será perdido.",
      confirmLabel: "Descartar",
      cancelLabel: "Continuar editando",
      tone: "danger",
    });
  }, []);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }

    function onClick(e: MouseEvent) {
      if (!dirtyRef.current || e.defaultPrevented) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (!isInternalNavigationClick(anchor, e, window.location)) return;
      e.preventDefault();
      e.stopPropagation();
      const href = anchor.pathname + anchor.search + anchor.hash;
      void confirmDiscard().then((ok) => {
        if (ok) {
          dirtyRef.current = false;
          router.push(href);
        }
      });
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    // captura: roda antes do onClick do <Link> do Next
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [confirmDiscard, router]);

  return { confirmDiscard };
}
