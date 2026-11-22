"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEntityOptions } from "../entity-queries";
import { hasQuickCreate, useQuickCreate } from "../quick-create";
import { normalizeText } from "../entity-model";
import type { Produto, Service } from "@/lib/types";
import type { ItemPick } from "./items-grid-model";

type Row =
  | { type: "product"; item: Produto }
  | { type: "service"; item: Service }
  | { type: "create-product" | "create-service" | "free" };

const productPick = (p: Produto): ItemPick => ({
  kind: "PRODUCT",
  id: p.id,
  name: p.nome,
  unit: p.unidade ?? null,
  price: p.preco_referencia ?? 0,
  cost: p.custo_referencia ?? 0,
});

const servicePick = (s: Service): ItemPick => ({
  kind: "SERVICE",
  id: s.id,
  name: s.name,
  unit: s.unit,
  price: s.reference_price ?? 0,
  cost: s.reference_cost ?? 0,
});

export function ItemPicker({ onPick, disabled }: { onPick: (pick: ItemPick) => void; disabled?: boolean }) {
  const listId = useId();
  const quickCreate = useQuickCreate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const products = useEntityOptions("product", debounced, open).options.slice(0, 6);
  const services = useEntityOptions("service", debounced, open).options.slice(0, 4);
  const q = query.trim();
  const exact = [...products, ...services].some((o) => normalizeText(o.label) === normalizeText(q));

  const rows: Row[] = [
    ...products.map((o) => ({ type: "product" as const, item: o.raw })),
    ...services.map((o) => ({ type: "service" as const, item: o.raw })),
    ...(q && !exact && hasQuickCreate("product") ? [{ type: "create-product" as const }] : []),
    ...(q && !exact && hasQuickCreate("service") ? [{ type: "create-service" as const }] : []),
    ...(q && !exact ? [{ type: "free" as const }] : []),
  ];

  function close() {
    setOpen(false);
    setQuery("");
    setDebounced("");
    setActive(0);
  }

  function choose(row: Row | undefined) {
    if (!row) return;
    if (row.type === "product") onPick(productPick(row.item));
    else if (row.type === "service") onPick(servicePick(row.item));
    else if (row.type === "free") onPick({ kind: "PRODUCT", id: null, name: q, unit: null, price: 0, cost: 0 });
    else if (row.type === "create-product") {
      quickCreate.open("product", { initialName: q, onCreated: (p) => onPick(productPick(p)) });
    } else {
      quickCreate.open("service", { initialName: q, onCreated: (s) => onPick(servicePick(s)) });
    }
    close();
  }

  function labelOf(row: Row): { title: string; hint?: string } {
    switch (row.type) {
      case "product":
        return { title: row.item.nome, hint: [row.item.category_name, row.item.unidade].filter(Boolean).join(" · ") || "Produto" };
      case "service":
        return { title: row.item.name, hint: ["Serviço", row.item.unit].filter(Boolean).join(" · ") };
      case "create-product":
        return { title: `＋ Criar produto "${q}"` };
      case "create-service":
        return { title: `＋ Criar serviço "${q}"` };
      case "free":
        return { title: `Usar "${q}" sem cadastro` };
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((a) => Math.min(a + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && open && rows.length > 0) {
      e.preventDefault();
      choose(rows[active]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") close();
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Plus className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && rows[active] ? `${listId}-${active}` : undefined}
          aria-label="Adicionar produto ou serviço"
          placeholder="Buscar produto ou serviço…"
          autoComplete="off"
          enterKeyHint="search"
          disabled={disabled}
          className="pl-9"
          value={query}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            setOpen(true);
            setQuery(e.target.value);
            setActive(0);
          }}
          onBlur={(e) => {
            if (!rootRef.current?.contains(e.relatedTarget as Node | null)) close();
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && rows.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Produtos e serviços"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {rows.map((row, i) => {
            const { title, hint } = labelOf(row);
            return (
              <li
                key={`${row.type}-${"item" in row ? row.item.id : i}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(row);
                }}
                className={cn(
                  "flex min-h-11 cursor-pointer flex-col justify-center rounded-md px-3 py-1.5 md:min-h-9",
                  i === active && "bg-accent text-accent-foreground",
                  row.type.startsWith("create") && "font-medium text-primary",
                )}
              >
                <span className="text-base md:text-sm">{title}</span>
                {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
