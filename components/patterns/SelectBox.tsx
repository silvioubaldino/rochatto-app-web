"use client";

import { cn } from "@/lib/utils";

/**
 * Caixa de seleção de linha (listas com seleção múltipla): a área de toque é 44 px no celular
 * (o rótulo envolve o `input`), 24 px no desktop. `relative z-10` a mantém acima do link da linha
 * do `DataTable`.
 */
export function SelectBox({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Nome acessível ("Selecionar Rock face"). */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("relative z-10 -m-2.5 inline-flex size-11 cursor-pointer items-center justify-center md:-m-1 md:size-8", disabled && "cursor-not-allowed opacity-50", className)}>
      <input
        type="checkbox"
        className="size-5 cursor-[inherit]"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
