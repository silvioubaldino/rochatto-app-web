"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterChipOption {
  value: string;
  label: string;
}

export interface FilterChipGroup {
  /** Nome acessível do grupo ("Situação da venda"). */
  label: string;
  options: readonly FilterChipOption[];
  value: string;
  onChange: (value: string) => void;
}

export interface FilterBarProps {
  /** Filtros rápidos em chips (Vendas: A entregar · Atrasadas · Todas). */
  chips?: readonly FilterChipGroup[];
  /** Busca por texto (debounce de 300 ms). */
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  /** Filtros avançados (período, cliente, cidade…): ficam num painel recolhível. */
  children?: ReactNode;
  /** Quantos filtros estão ativos — habilita "Limpar (N)". */
  activeCount?: number;
  onClear?: () => void;
  className?: string;
}

/**
 * Barra de filtros padrão: chips rápidos + busca + painel avançado + "Limpar".
 * O estado fica na URL via `useUrlFilters`; a barra só apresenta e dispara `onChange`.
 */
export function FilterBar({ chips, search, children, activeCount = 0, onClear, className }: FilterBarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [draft, setDraft] = useState(search?.value ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchValue = search?.value;
  const onSearchChange = search?.onChange;

  // Valor externo mudou (voltar, limpar): alinha o campo (ajuste de estado durante o render).
  const [seen, setSeen] = useState(searchValue);
  if (searchValue !== seen) {
    setSeen(searchValue);
    if (searchValue !== undefined) setDraft(searchValue);
  }
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  function handleSearch(v: string) {
    setDraft(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearchChange?.(v), 300);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {search && (
          <div className="relative min-w-0 flex-1 basis-56">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              role="searchbox"
              aria-label={search.placeholder ?? "Buscar"}
              placeholder={search.placeholder ?? "Buscar…"}
              value={draft}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
        {children && (
          <Button
            type="button"
            variant="outline"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((o) => !o)}
          >
            <SlidersHorizontal aria-hidden />
            Filtros
          </Button>
        )}
        {onClear && activeCount > 0 && (
          <Button type="button" variant="ghost" onClick={onClear}>
            <X aria-hidden />
            Limpar ({activeCount})
          </Button>
        )}
      </div>

      {chips?.map((group) => (
        <div key={group.label} role="group" aria-label={group.label} className="flex flex-wrap gap-2">
          {group.options.map((o) => {
            const active = group.value === o.value;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={active}
                onClick={() => group.onChange(o.value)}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border px-4 text-base transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:min-h-8 md:px-3 md:text-sm",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      ))}

      {children && advancedOpen && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-4">
          {children}
        </div>
      )}
    </div>
  );
}
