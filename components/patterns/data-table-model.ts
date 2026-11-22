export type SortDirection = "asc" | "desc";
export interface SortState {
  id: string;
  dir: SortDirection;
}

export type SortValue = string | number | null | undefined;

export interface SortableColumn<T> {
  id: string;
  sortValue?: (row: T) => SortValue;
}

export function nextSort(current: SortState | null, columnId: string): SortState | null {
  if (!current || current.id !== columnId) return { id: columnId, dir: "asc" };
  if (current.dir === "asc") return { id: columnId, dir: "desc" };
  return null;
}

function compare(a: SortValue, b: SortValue): number {
  // vazios sempre no fim, em qualquer direção (tratado fora); aqui só compara preenchidos
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
}

export function sortRows<T>(rows: readonly T[], columns: readonly SortableColumn<T>[], sort: SortState | null): T[] {
  const column = sort ? columns.find((c) => c.id === sort.id) : undefined;
  if (!sort || !column?.sortValue) return [...rows];
  const get = column.sortValue;
  const sign = sort.dir === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: get(row) }))
    .sort((x, y) => {
      const xe = x.value === null || x.value === undefined || x.value === "";
      const ye = y.value === null || y.value === undefined || y.value === "";
      if (xe || ye) return xe === ye ? x.index - y.index : xe ? 1 : -1;
      return compare(x.value, y.value) * sign || x.index - y.index;
    })
    .map((x) => x.row);
}

export interface RowGroup<T> {
  key: string;
  rows: T[];
}

export function groupRows<T>(
  rows: readonly T[],
  keyOf: (row: T) => string,
  options: { order?: readonly string[]; lastKeys?: readonly string[] } = {},
): RowGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  const last = new Set(options.lastKeys ?? []);
  const fixed = (options.order ?? []).filter((k) => map.has(k));
  const fixedSet = new Set(fixed);
  const rest = [...map.keys()]
    .filter((k) => !fixedSet.has(k) && !last.has(k))
    .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  const tail = [...map.keys()].filter((k) => !fixedSet.has(k) && last.has(k));
  return [...fixed, ...rest, ...tail].map((key) => ({ key, rows: map.get(key) ?? [] }));
}

export function ariaSort(sort: SortState | null, columnId: string): "ascending" | "descending" | "none" {
  if (!sort || sort.id !== columnId) return "none";
  return sort.dir === "asc" ? "ascending" : "descending";
}
