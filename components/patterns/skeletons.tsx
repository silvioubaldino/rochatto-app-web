import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Esqueleto de página (cabeçalho + blocos): no lugar de spinner de página inteira (F27). */
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)} aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

/** Esqueleto de lista no formato final: linhas (desktop) ou cartões (celular). */
export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full md:h-11" />
      ))}
    </div>
  );
}
