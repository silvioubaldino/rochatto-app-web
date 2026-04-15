"use client";

import type { StatusVenda } from "@/lib/types";
import { STATUS_LABELS, STATUS_COLORS, formatData } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: StatusVenda;
  dataEntrega?: string;
}

export function StatusBadge({ status, dataEntrega }: StatusBadgeProps) {
  let label = STATUS_LABELS[status];
  if (status === "A_ENTREGAR_DATA" && dataEntrega) {
    label = `A Entregar em ${formatData(dataEntrega)}`;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_COLORS[status],
      )}
    >
      {label}
    </span>
  );
}
