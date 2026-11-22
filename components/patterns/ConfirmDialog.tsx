"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/errors";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` = irreversível (cancelar venda, excluir): botão e ícone em destaque. */
  tone?: "default" | "danger";
  /**
   * Executa a ação. Se lançar, o erro aparece NO diálogo (409 no contexto — UX-P09) e ele
   * continua aberto; se resolver, fecha.
   */
  onConfirm: () => Promise<unknown> | void;
  /** Motivo que desabilita a confirmação (regra explicada ANTES — UX-9). */
  disabledReason?: string;
}

/** Confirmação do IRREVERSÍVEL (UX-8). `window.confirm` é proibido. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Voltar",
  tone = "default",
  onConfirm,
  disabledReason,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err, "Não foi possível concluir."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (loading) return;
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className={tone === "danger" ? "flex items-center gap-2 text-destructive" : undefined}>
            {tone === "danger" && <AlertTriangle className="size-5" aria-hidden />}
            {title}
          </AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {disabledReason && (
          <p role="note" className="rounded-md bg-warning-subtle px-3 py-2 text-sm text-warning">
            {disabledReason}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <Button
            variant={tone === "danger" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={loading || !!disabledReason}
          >
            {loading && <Loader2 className="animate-spin" aria-hidden />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --- Forma imperativa: `if (await confirm({...})) …` (substitui window.confirm) ------------

export type ConfirmOptions = Omit<ConfirmDialogProps, "open" | "onOpenChange" | "onConfirm">;

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Monta o diálogo único de confirmação (uma vez, no AppShell). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolver.current?.(false);
      resolver.current = resolve;
      setOptions(opts);
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        {...(options ?? { title: "" })}
        open={options !== null}
        onOpenChange={(open) => {
          if (!open) settle(false);
        }}
        onConfirm={() => settle(true)}
      />
    </ConfirmContext.Provider>
  );
}

/** `const confirm = useConfirm(); if (!(await confirm({ title: "…" }))) return;` */
export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm precisa de <ConfirmProvider> (já incluído no AppShell).");
  return ctx;
}

// --- Desfazer (UX-8: o reversível age e oferece "Desfazer", 8 s) --------------------------

export const UNDO_DURATION_MS = 8000;

/**
 * `const undoable = useUndoToast(); undoable("Venda marcada como entregue.", () => revert())`.
 * O toast oferece "Desfazer" por 8 s; `undo` roda uma vez, e se falhar mostra o erro.
 */
export function useUndoToast() {
  return useCallback((message: string, undo: () => Promise<unknown> | void, duration = UNDO_DURATION_MS) => {
    toast(message, {
      duration,
      action: {
        label: "Desfazer",
        onClick: () => {
          Promise.resolve(undo()).catch((err: unknown) => toast.error(errorMessage(err, "Não foi possível desfazer.")));
        },
      },
    });
  }, []);
}
