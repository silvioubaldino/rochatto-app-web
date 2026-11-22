"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { entityHref, type EntityType } from "./entity-model";
import { hasPreview, isPlainClick, usePeek } from "./EntitySheet";

export interface EntityLinkProps {
  type: EntityType;
  id: string;
  /** O que aparece (nome humano — nunca o UUID). */
  children: ReactNode;
  /**
   * `peek` abre a PRÉVIA lateral (referência dentro de outra entidade — UX-P04);
   * `page` (padrão) vai para a página. Sem prévia registrada, `peek` cai em `page`.
   * Ctrl/⌘/clique do meio sempre abrem a PÁGINA (o `href` é real).
   */
  mode?: "page" | "peek";
  className?: string;
}

/**
 * Toda entidade citada é um link (UX-4). Em linhas de `DataTable` o link já recebe `z-10`
 * para ficar acima do link da linha.
 */
export function EntityLink({ type, id, children, mode = "page", className }: EntityLinkProps) {
  const { open } = usePeek();
  const href = entityHref(type, id);
  const peeks = mode === "peek" && hasPreview(type);
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (peeks && isPlainClick(e.nativeEvent)) {
          e.preventDefault();
          open(type, id);
        }
      }}
      className={cn(
        "relative z-10 rounded-sm underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      {children}
    </Link>
  );
}
