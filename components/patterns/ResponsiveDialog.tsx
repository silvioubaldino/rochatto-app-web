"use client";

import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ArrowLeft, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ResponsiveDialogSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<ResponsiveDialogSize, string> = {
  sm: "md:max-w-sm",
  md: "md:max-w-lg",
  lg: "md:max-w-2xl",
  xl: "md:max-w-4xl",
};

export interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Ações fixas: no celular ficam coladas embaixo (acima do teclado e da área segura). */
  footer?: ReactNode;
  size?: ResponsiveDialogSize;
  children: ReactNode;
  /** Impede fechar por clique fora/Esc (ex.: enquanto salva). */
  dismissible?: boolean;
}

/**
 * Diálogo do desktop; TELA CHEIA no celular, com cabeçalho (voltar/fechar) e ação fixos
 * (UX-P13). Um só DOM — o layout muda por CSS (`md:`), então nada pisca ao girar o aparelho.
 * Foco preso, Esc fecha, `aria-labelledby` no título (Base UI).
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  size = "md",
  children,
  dismissible = true,
}: ResponsiveDialogProps) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !dismissible) return;
        onOpenChange(next);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 max-md:hidden supports-backdrop-filter:backdrop-blur-xs" />
        <DialogPrimitive.Popup
          data-slot="responsive-dialog"
          className={cn(
            "fixed z-50 flex flex-col bg-popover text-sm text-popover-foreground outline-none",
            // celular: tela cheia (dvh = altura útil com a barra do navegador)
            "inset-0 h-dvh w-full",
            // desktop: caixa centralizada
            "md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:max-h-[85dvh] md:w-full md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:ring-1 md:ring-foreground/10",
            SIZE_CLASSES[size],
          )}
        >
          <header className="flex shrink-0 items-center gap-2 border-b px-2 pt-safe md:px-4 md:py-3">
            <DialogPrimitive.Close
              render={<Button variant="ghost" size="icon" aria-label="Voltar" className="md:hidden" />}
            >
              <ArrowLeft aria-hidden />
            </DialogPrimitive.Close>
            <div className="min-w-0 flex-1 py-2">
              <DialogPrimitive.Title className="truncate text-base font-medium">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              render={<Button variant="ghost" size="icon-sm" aria-label="Fechar" className="max-md:hidden" />}
            >
              <XIcon aria-hidden />
            </DialogPrimitive.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>

          {footer && (
            <footer className="flex shrink-0 flex-col-reverse gap-2 border-t bg-popover px-4 py-3 pb-safe md:flex-row md:justify-end md:rounded-b-xl md:bg-muted/50">
              {footer}
            </footer>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
