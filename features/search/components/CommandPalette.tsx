"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { hasPreview, usePeek } from "@/components/entity/EntitySheet";
import { cn } from "@/lib/utils";
import { moveActive, paletteRows, type PaletteRow } from "../model";
import { SEARCH_MIN_CHARS, useGlobalSearch } from "../queries";

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/** ⌘K / Ctrl+K em qualquer tela; "/" quando não se está digitando. */
export function useCommandPaletteShortcut(onOpen: () => void) {
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpen();
      } else if (e.key === "/" && !mod && !isTypingTarget(e.target)) {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpen]);
}

/**
 * Busca global e ações (UX-P01): nome ou número ("154" acha Orçamento, Venda e Compra nº 154).
 * `Enter` abre a página; `→` (ou o botão do olho, no toque) abre a prévia. Tela cheia no celular.
 */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Buscar" size="lg">
      {/* O corpo monta ao abrir: cada abertura começa limpa, sem efeito de reset. */}
      {open && <PaletteBody onClose={() => onOpenChange(false)} />}
    </ResponsiveDialog>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const peek = usePeek();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const { groups, isLoading, searched } = useGlobalSearch(debounced);
  const rows = paletteRows(query, searched ? groups : []);
  const current = Math.min(active, Math.max(rows.length - 1, 0));

  function go(row: PaletteRow) {
    onClose();
    router.push(row.href);
  }
  function preview(row: PaletteRow) {
    if (!row.entity || !hasPreview(row.entity.type)) return go(row);
    onClose();
    peek.open(row.entity.type, row.entity.id);
  }

  function onKeyDown(e: KeyboardEvent) {
    const row = rows[current];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive(moveActive(current, e.key === "ArrowDown" ? 1 : -1, rows.length));
    } else if (e.key === "Enter" && row) {
      e.preventDefault();
      go(row);
    } else if (e.key === "ArrowRight" && row?.entity && (e.target as HTMLInputElement).selectionStart === query.length) {
      e.preventDefault();
      preview(row);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={rows[current] ? `${listId}-${current}` : undefined}
          aria-label="Buscar por nome ou número"
          placeholder="Buscar cliente, produto, nº 154…"
          enterKeyHint="search"
          autoComplete="off"
          className="pl-9"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        {isLoading && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />}
      </div>

      {query.trim().length > 0 && query.trim().length < SEARCH_MIN_CHARS && (
        <p className="text-sm text-muted-foreground">Digite ao menos {SEARCH_MIN_CHARS} caracteres.</p>
      )}
      {searched && !isLoading && groups.length === 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          Nada encontrado para “{debounced.trim()}”.
        </p>
      )}

      <ul id={listId} role="listbox" aria-label="Resultados" className="space-y-0.5">
        {rows.map((row, i) => {
          const header = i === 0 || rows[i - 1].group !== row.group;
          return (
            <li key={row.key} role="presentation">
              {header && (
                <p className="px-2 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {row.group}
                </p>
              )}
              <div
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === current}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-lg px-2",
                  i === current ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                )}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => go(row)}
                  className="min-w-0 flex-1 py-2 text-left"
                >
                  <span className="block truncate text-base md:text-sm">{row.label}</span>
                  {row.context && <span className="block truncate text-sm text-muted-foreground">{row.context}</span>}
                </button>
                {row.entity && hasPreview(row.entity.type) && (
                  <Button
                    type="button"
                    tabIndex={-1}
                    variant="ghost"
                    size="icon"
                    aria-label={`Prévia: ${row.label}`}
                    onClick={() => preview(row)}
                  >
                    <Eye aria-hidden />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
