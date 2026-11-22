"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { cn } from "@/lib/utils";
import type { PendingActionGroup, PendingSaleItemGroup } from "@/lib/types";
import { groupSummary, groupTitle } from "../model";
import { PendingRow } from "./PendingRow";

/** Um grupo de pendências: resumo numa linha; "›" expande as linhas com a ação de cada uma. */
export function PendingGroupCard({
  group,
  today,
  horizonDays,
  queue,
}: {
  group: PendingActionGroup;
  today: string;
  horizonDays: number;
  queue: readonly PendingSaleItemGroup[];
}) {
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronDown : ChevronRight;
  const hidden = group.count - group.items.length;
  return (
    <section className="rounded-lg border bg-card" data-kind={group.kind}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex min-h-14 w-full items-center gap-3 rounded-lg px-4 py-2 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          "hover:bg-muted/40",
        )}
      >
        <span
          aria-hidden
          className={cn("size-2.5 shrink-0 rounded-full", group.overdue_count > 0 ? "bg-danger" : "bg-transparent")}
        />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{groupTitle(group.kind, today, horizonDays)}</span>
          {group.overdue_count > 0 && (
            <StatusBadge tone="danger">
              {group.overdue_count} {group.overdue_count === 1 ? "vencida" : "vencidas"}
            </StatusBadge>
          )}
        </span>
        <span className="shrink-0 text-sm tabular-nums">{groupSummary(group)}</span>
        <Chevron className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {open && (
        <div className="border-t px-4">
          <ul className="divide-y">
            {group.items.map((item) => (
              <PendingRow key={`${item.entity.type}:${item.entity.id}`} kind={group.kind} item={item} queue={queue} />
            ))}
          </ul>
          {hidden > 0 && <p className="py-3 text-sm text-muted-foreground">e mais {hidden}</p>}
        </div>
      )}
    </section>
  );
}
