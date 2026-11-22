"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsPhone } from "@/lib/media";
import { EmptyState, ErrorState, type StateAction } from "./states";
import { ListSkeleton } from "./skeletons";
import {
  ariaSort,
  groupRows,
  nextSort,
  sortRows,
  type SortState,
  type SortValue,
} from "./data-table-model";

/** Papel da coluna no cartão do celular (UX-P06): título, 2 linhas de contexto, valor, status. */
export type PhoneRole = "title" | "subtitle" | "meta" | "value" | "badge" | "hidden";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Presente = coluna ordenável. */
  sortValue?: (row: T) => SortValue;
  align?: "left" | "right";
  /** Largura CSS (só desktop). */
  width?: string;
  /** Papel no cartão do celular; padrão `meta`. A primeira coluna `title` vira o link da linha. */
  phone?: PhoneRole;
  /** Rodapé de totais da coluna (desktop; no celular some — use `summary`). */
  footer?: ReactNode;
}

export interface DataTableGrouping<T> {
  keyOf: (row: T) => string;
  /** Cabeçalho do grupo. */
  label: (key: string, rows: T[]) => ReactNode;
  /** Resumo do grupo (somas) mostrado no cabeçalho. */
  summary?: (key: string, rows: T[]) => ReactNode;
  /** Ações do grupo (ex.: "Pagar tudo deste credor"), ao lado do cabeçalho — fora do botão que recolhe. */
  actions?: (key: string, rows: T[]) => ReactNode;
  order?: readonly string[];
  lastKeys?: readonly string[];
  /** Grupos começam recolhidos? (padrão: expandidos) */
  startCollapsed?: boolean;
}

export interface DataTableProps<T> {
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  /** LINK REAL da linha (abre em nova aba, teclado, leitor de tela — F16). */
  rowHref?: (row: T) => string | undefined;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: { title: string; description?: string; action?: StateAction };
  grouping?: DataTableGrouping<T>;
  /** Linha de totais abaixo da lista (desktop e celular). */
  summary?: ReactNode;
  /** Ordenação inicial. */
  defaultSort?: SortState | null;
  /** `auto` = cartões no celular, tabela no resto. Force em testes/telas especiais. */
  mode?: "auto" | "table" | "cards";
  /** Nome acessível da tabela. */
  caption: string;
  className?: string;
}

const ALIGN: Record<"left" | "right", string> = { left: "text-left", right: "text-right" };

/**
 * Lista padrão do app (UX-P06): ordenação, linha-link real, cartões no celular, agrupamento
 * recolhível, totais, e estados vazio/erro/carregando com esqueleto. Substitui as tabelas
 * escritas à mão (`<table>` fora daqui é barrado por lint).
 *
 * Elementos interativos DENTRO de uma linha (EntityLink, botões) devem ter `relative z-10`
 * para ficarem acima do link da linha.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  isLoading,
  error,
  onRetry,
  empty = { title: "Nada por aqui ainda." },
  grouping,
  summary,
  defaultSort = null,
  mode = "auto",
  caption,
  className,
}: DataTableProps<T>) {
  const phone = useIsPhone();
  const asCards = mode === "cards" || (mode === "auto" && phone);
  const [sort, setSort] = useState<SortState | null>(defaultSort);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [allCollapsedInit] = useState(!!grouping?.startCollapsed);

  const sorted = useMemo(() => sortRows(rows, columns, sort), [rows, columns, sort]);
  const groups = useMemo(
    () =>
      grouping
        ? groupRows(sorted, grouping.keyOf, { order: grouping.order, lastKeys: grouping.lastKeys })
        : null,
    [sorted, grouping],
  );

  if (error) return <ErrorState onRetry={onRetry} className={className} />;
  if (isLoading) return <ListSkeleton className={className} />;
  if (rows.length === 0) {
    return (
      <div className={cn("rounded-lg border", className)}>
        <EmptyState {...empty} />
      </div>
    );
  }

  const isCollapsed = (key: string) => (allCollapsedInit ? !collapsed.has(key) : collapsed.has(key));
  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const sections = groups ?? [{ key: "", rows: sorted }];
  const hasFooter = columns.some((c) => c.footer !== undefined);

  if (asCards) {
    return (
      <div className={cn("space-y-2", className)} role="list" aria-label={caption}>
        {sections.map((g) => (
          <Fragment key={g.key || "all"}>
            {grouping && (
              <GroupToggle
                label={grouping.label(g.key, g.rows)}
                summary={grouping.summary?.(g.key, g.rows)}
                actions={grouping.actions?.(g.key, g.rows)}
                open={!isCollapsed(g.key)}
                onToggle={() => toggle(g.key)}
              />
            )}
            {(!grouping || !isCollapsed(g.key)) &&
              g.rows.map((row) => (
                <RowCard key={rowKey(row)} row={row} columns={columns} href={rowHref?.(row)} />
              ))}
          </Fragment>
        ))}
        {summary && <div className="rounded-lg bg-muted/50 p-3 text-sm font-medium">{summary}</div>}
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border", className)}>
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                aria-sort={col.sortValue ? ariaSort(sort, col.id) : undefined}
                style={col.width ? { width: col.width } : undefined}
                className={cn("px-4 py-3 font-medium text-muted-foreground", ALIGN[col.align ?? "left"])}
              >
                {col.sortValue ? (
                  <button
                    type="button"
                    onClick={() => setSort((s) => nextSort(s, col.id))}
                    className={cn(
                      "inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      col.align === "right" && "flex-row-reverse",
                    )}
                  >
                    {col.header}
                    {sort?.id === col.id ? (
                      sort.dir === "asc" ? (
                        <ArrowUp className="size-3.5" aria-hidden />
                      ) : (
                        <ArrowDown className="size-3.5" aria-hidden />
                      )
                    ) : (
                      <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((g) => (
            <Fragment key={g.key || "all"}>
              {grouping && (
                <tr className="border-b bg-muted/30">
                  <td colSpan={columns.length} className="p-0">
                    <GroupToggle
                      label={grouping.label(g.key, g.rows)}
                      summary={grouping.summary?.(g.key, g.rows)}
                      actions={grouping.actions?.(g.key, g.rows)}
                      open={!isCollapsed(g.key)}
                      onToggle={() => toggle(g.key)}
                    />
                  </td>
                </tr>
              )}
              {(!grouping || !isCollapsed(g.key)) &&
                g.rows.map((row) => (
                  <TableRow key={rowKey(row)} row={row} columns={columns} href={rowHref?.(row)} />
                ))}
            </Fragment>
          ))}
        </tbody>
        {hasFooter && (
          <tfoot>
            <tr className="border-t bg-muted/50 font-medium">
              {columns.map((col) => (
                <td key={col.id} className={cn("px-4 py-3", ALIGN[col.align ?? "left"])}>
                  {col.footer}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
      {summary && <div className="border-t bg-muted/50 px-4 py-3 text-sm font-medium">{summary}</div>}
    </div>
  );
}

function GroupToggle({
  label,
  summary,
  actions,
  open,
  onToggle,
}: {
  label: ReactNode;
  summary?: ReactNode;
  actions?: ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 max-md:rounded-lg max-md:bg-muted/30">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex min-h-11 min-w-0 flex-1 basis-48 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {open ? <ChevronDown className="size-4 shrink-0" aria-hidden /> : <ChevronRight className="size-4 shrink-0" aria-hidden />}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {summary && <span className="shrink-0 text-xs font-normal text-muted-foreground">{summary}</span>}
      </button>
      {actions && <div className="flex shrink-0 items-center gap-2 px-3 pb-2 md:pb-0">{actions}</div>}
    </div>
  );
}

function TableRow<T>({ row, columns, href }: { row: T; columns: readonly DataTableColumn<T>[]; href?: string }) {
  const linkColumn = href ? (columns.find((c) => c.phone === "title") ?? columns[0]) : undefined;
  return (
    <tr className={cn("relative border-b transition-colors last:border-b-0", href && "hover:bg-muted/40")}>
      {columns.map((col) => {
        const content = col.cell(row);
        return (
          <td key={col.id} className={cn("px-4 py-3", ALIGN[col.align ?? "left"])}>
            {href && col === linkColumn ? (
              // O link cobre a linha toda (after:absolute inset-0); links internos usam z-10.
              <Link href={href} className="font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
                {content}
              </Link>
            ) : (
              content
            )}
          </td>
        );
      })}
    </tr>
  );
}

function RowCard<T>({ row, columns, href }: { row: T; columns: readonly DataTableColumn<T>[]; href?: string }) {
  const by = (role: PhoneRole) => columns.filter((c) => (c.phone ?? "meta") === role);
  const title = by("title")[0] ?? columns[0];
  const subtitles = by("subtitle");
  const metas = by("meta").filter((c) => c !== title);
  const values = by("value");
  const badges = by("badge");

  const titleNode = href ? (
    // O link cobre o cartão todo (after:absolute inset-0); o resto do conteúdo fica fora do <a>.
    <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
      {title.cell(row)}
    </Link>
  ) : (
    title.cell(row)
  );

  return (
    <div role="listitem" className="relative rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{titleNode}</div>
          {subtitles.map((c) => (
            <div key={c.id} className="truncate text-sm text-muted-foreground">
              {c.cell(row)}
            </div>
          ))}
        </div>
        {values.length > 0 && (
          <div className="shrink-0 text-right font-medium">
            {values.map((c) => (
              <div key={c.id}>{c.cell(row)}</div>
            ))}
          </div>
        )}
      </div>
      {(metas.length > 0 || badges.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {metas.map((c) => (
            <span key={c.id}>
              <span className="sr-only">{c.header}: </span>
              {c.cell(row)}
            </span>
          ))}
          {badges.map((c) => (
            <span key={c.id}>{c.cell(row)}</span>
          ))}
        </div>
      )}
    </div>
  );
}
