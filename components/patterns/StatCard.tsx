import type { ReactNode } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TONE_SUBTLE_CLASSES, type Tone } from "@/lib/format";

export interface StatCardProps {
  title: string;
  /** O número, já formatado (`MoneyText` ou texto). */
  value: ReactNode;
  subtitle?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  isLoading?: boolean;
  /** Vira um LINK real para a lista que compõe o número (drill-down — UX-4). */
  href?: string;
  className?: string;
}

/** Indicador (KPI): número em destaque, tom semântico e link para a lista de origem. */
export function StatCard({ title, value, subtitle, tone, icon, isLoading, href, className }: StatCardProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-2 rounded-lg border p-4", className)} aria-busy="true">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-40" />
        {subtitle !== undefined && <Skeleton className="h-3 w-28" />}
      </div>
    );
  }
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && <span className="text-muted-foreground" aria-hidden>{icon}</span>}
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </>
  );
  const classes = cn("block space-y-1 rounded-lg border p-4", tone ? TONE_SUBTLE_CLASSES[tone] : "bg-card", href && "transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none", className);
  return href ? <Link href={href} className={classes}>{body}</Link> : <div className={classes}>{body}</div>;
}
