"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createOptionLabel,
  ENTITY_LABELS,
  pushRecent,
  rankOptions,
  shouldOfferCreate,
  type EntityKind,
} from "./entity-model";
import {
  toEntityOption,
  useEntityById,
  useEntityOptions,
  type EntityOption,
  type EntityRawMap,
} from "./entity-queries";
import { hasQuickCreate, useQuickCreate } from "./quick-create";

export interface EntityComboboxProps<K extends EntityKind> {
  kind: K;
  value: string;
  onChange: (id: string, option: EntityOption<K> | null) => void;
  id?: string;
  placeholder?: string;
  selectedLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
  allowCreate?: boolean;
  clearable?: boolean;
  filter?: (raw: EntityRawMap[K]) => boolean;
  prefer?: (raw: EntityRawMap[K]) => boolean;
  recents?: boolean;
  className?: string;
  "aria-label"?: string;
}

const RECENTS_KEY = (kind: EntityKind) => `entity-recents:${kind}`;

function readRecents(kind: EntityKind): string[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY(kind));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeRecents(kind: EntityKind, ids: string[]) {
  try {
    window.localStorage.setItem(RECENTS_KEY(kind), JSON.stringify(ids));
  } catch {
  }
}

export function EntityCombobox<K extends EntityKind>({
  kind,
  value,
  onChange,
  id,
  placeholder,
  selectedLabel,
  disabled,
  invalid,
  allowCreate = true,
  clearable = true,
  filter,
  prefer,
  recents = true,
  className,
  ...aria
}: EntityComboboxProps<K>) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const listId = `${autoId}-list`;
  const quickCreate = useQuickCreate();
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [picked, setPicked] = useState<EntityOption<K> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  function openList() {
    if (!open && recents) setRecentIds(readRecents(kind));
    setOpen(true);
  }

  const { options: fetched, isLoading } = useEntityOptions(kind, debounced, open);
  const { option: byId } = useEntityById(kind, value && !picked ? value : null);

  const options = useMemo(() => {
    const allowed = filter ? fetched.filter((o) => filter(o.raw)) : fetched;
    return rankOptions(allowed, debounced, {
      prefer: prefer ? (o) => prefer(o.raw) : undefined,
      recents: recents ? recentIds : undefined,
    });
  }, [fetched, filter, prefer, debounced, recents, recentIds]);

  const canCreate = allowCreate && hasQuickCreate(kind);
  const offerCreate = canCreate && (shouldOfferCreate(query, options) || (options.length === 0 && !isLoading));
  const rows: Array<{ type: "option"; option: EntityOption<K> } | { type: "create" }> = [
    ...options.map((option) => ({ type: "option" as const, option })),
    ...(offerCreate ? [{ type: "create" as const }] : []),
  ];

  const selectedText = value ? (picked?.id === value ? picked.label : (byId?.label ?? selectedLabel ?? "")) : "";

  function close() {
    setOpen(false);
    setQuery("");
    setDebounced("");
    setActive(0);
  }

  function select(option: EntityOption<K>) {
    setPicked(option);
    if (recents) writeRecents(kind, pushRecent(readRecents(kind), option.id));
    onChange(option.id, option);
    close();
  }

  function create() {
    quickCreate.open(kind, {
      initialName: query.trim(),
      onCreated: (entity) => select(toEntityOption(kind, entity)),
    });
    close();
  }

  function choose(index: number) {
    const row = rows[index];
    if (!row) return;
    if (row.type === "create") create();
    else select(row.option);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openList();
      else setActive((a) => Math.min(a + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (open && rows.length > 0) {
        e.preventDefault();
        choose(active);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    } else if (e.key === "Tab") {
      close();
    }
  }

  const activeId = open && rows[active] ? `${listId}-${active}` : undefined;
  const showClear = clearable && !!value && !disabled;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Input
        id={inputId}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        aria-label={aria["aria-label"]}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        enterKeyHint="search"
        disabled={disabled}
        placeholder={placeholder ?? `Buscar ${ENTITY_LABELS[kind]}`}
        value={open ? query : selectedText}
        className={cn(showClear && "pr-10")}
        onFocus={openList}
        onClick={openList}
        onChange={(e) => {
          openList();
          setQuery(e.target.value);
          setActive(0);
        }}
        onBlur={(e) => {
          // Clique numa opção não pode fechar antes de escolher: opções usam onMouseDown.
          if (!rootRef.current?.contains(e.relatedTarget as Node | null)) close();
        }}
        onKeyDown={onKeyDown}
      />
      {showClear && (
        <button
          type="button"
          aria-label="Limpar seleção"
          className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          onClick={() => {
            setPicked(null);
            onChange("", null);
          }}
        >
          <X className="size-4" aria-hidden />
        </button>
      )}

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Resultados"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {isLoading && rows.length === 0 && (
            <li role="presentation" className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Buscando…
            </li>
          )}
          {rows.map((row, i) => {
            const isActive = i === active;
            const common = {
              id: `${listId}-${i}`,
              role: "option" as const,
              "aria-selected": row.type === "option" ? row.option.id === value : false,
              onMouseEnter: () => setActive(i),
              // mousedown (não click): acontece antes do blur do input
              onMouseDown: (e: React.MouseEvent) => {
                e.preventDefault();
                choose(i);
              },
              className: cn(
                "flex min-h-11 cursor-pointer flex-col justify-center rounded-md px-3 py-1.5 md:min-h-9",
                isActive && "bg-accent text-accent-foreground",
              ),
            };
            return row.type === "create" ? (
              <li key="create" {...common} className={cn(common.className, "font-medium text-primary")}>
                {createOptionLabel(kind, query)}
              </li>
            ) : (
              <li key={row.option.id} {...common}>
                <span className="text-base md:text-sm">{row.option.label}</span>
                {row.option.description && (
                  <span className="text-xs text-muted-foreground">{row.option.description}</span>
                )}
              </li>
            );
          })}
          {!isLoading && rows.length === 0 && (
            <li role="presentation" className="px-3 py-2 text-sm text-muted-foreground">
              Nada encontrado.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
