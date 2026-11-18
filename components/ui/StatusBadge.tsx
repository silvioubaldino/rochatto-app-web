"use client";

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  /** Rótulo PT-BR (dos mapas de lib/formatters.ts — nunca o código do enum). */
  label: string;
  /** Classes de cor (dos mapas *_COLORS de lib/formatters.ts). */
  colorClassName: string;
  className?: string;
  title?: string;
}

export function StatusBadge({ label, colorClassName, className, title }: StatusBadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        colorClassName,
        className,
      )}
    >
      {label}
    </span>
  );
}
