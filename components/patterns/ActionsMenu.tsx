"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export interface ActionItem {
  id: string;
  label: string;
  onSelect: () => void;
  /** Ação destrutiva (excluir, cancelar). */
  danger?: boolean;
  disabled?: boolean;
  /** Por que está desabilitada (mostrada no item — UX-9). */
  disabledReason?: string;
}

/** Menu "⋯" das ações secundárias do cabeçalho (UX-P07): visível no celular, sem hover. */
export function ActionsMenu({ items, label = "Mais ações" }: { items: readonly ActionItem[]; label?: string }) {
  if (items.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" size="icon" aria-label={label} />}>
        <MoreHorizontal aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {items.map((a) => (
          <DropdownMenuItem
            key={a.id}
            variant={a.danger ? "destructive" : "default"}
            disabled={a.disabled}
            onClick={a.onSelect}
            className="flex-col items-start gap-0"
          >
            <span>{a.label}</span>
            {a.disabled && a.disabledReason && <span className="text-xs text-muted-foreground">{a.disabledReason}</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
