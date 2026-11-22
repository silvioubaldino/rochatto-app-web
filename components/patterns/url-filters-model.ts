// Estado de filtros na URL (UX-6): leitura, escrita e contagem — puro e testado.

export interface FilterSpecEntry {
  /** Valor quando o parâmetro não está na URL (não é gravado de volta). */
  default?: string;
}
export type FilterSpec = Record<string, FilterSpecEntry>;
export type FilterValues<S extends FilterSpec> = { [K in keyof S]: string };

interface ParamReader {
  get(name: string): string | null;
}

/** Lê os filtros declarados em `spec` dos parâmetros da URL. */
export function parseFilters<S extends FilterSpec>(spec: S, params: ParamReader): FilterValues<S> {
  const out = {} as FilterValues<S>;
  for (const key of Object.keys(spec) as (keyof S & string)[]) {
    out[key] = params.get(key) ?? spec[key].default ?? "";
  }
  return out;
}

/**
 * Aplica `patch` sobre os parâmetros ATUAIS e devolve a nova query (sem "?"). Parâmetros que
 * não são filtros (ex.: `peek`, `tab`) são preservados; valor vazio ou igual ao padrão sai da URL.
 */
export function applyFilterPatch<S extends FilterSpec>(
  spec: S,
  current: URLSearchParams,
  patch: Partial<FilterValues<S>>,
): string {
  const next = new URLSearchParams(current.toString());
  for (const key of Object.keys(patch) as (keyof S & string)[]) {
    const value = patch[key];
    const def = spec[key]?.default ?? "";
    if (value === undefined || value === "" || value === def) next.delete(key);
    else next.set(key, value);
  }
  return next.toString();
}

/** Quantos filtros estão fora do padrão (para o "Limpar (2)"). */
export function countActiveFilters<S extends FilterSpec>(spec: S, values: FilterValues<S>, ignore: readonly string[] = []): number {
  return (Object.keys(spec) as (keyof S & string)[]).filter(
    (k) => !ignore.includes(k) && (values[k] ?? "") !== (spec[k].default ?? ""),
  ).length;
}

/** Patch que volta todos os filtros ao padrão. */
export function clearPatch<S extends FilterSpec>(spec: S, keep: readonly string[] = []): Partial<FilterValues<S>> {
  const patch: Partial<FilterValues<S>> = {};
  for (const k of Object.keys(spec) as (keyof S & string)[]) {
    if (!keep.includes(k)) patch[k] = (spec[k].default ?? "") as FilterValues<S>[typeof k];
  }
  return patch;
}

export function withQuery(pathname: string, query: string): string {
  return query ? `${pathname}?${query}` : pathname;
}
