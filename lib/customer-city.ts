import type { Cliente, Quote, QuoteStatus, Venda } from "@/lib/types";

/**
 * Cidade de uma Sale/Quote = `cidade` do Customer (RF-01: cidade/endereço da obra), juntada no
 * cliente pelo id do Customer — `GET /vendas` e `GET /quotes` não trazem a cidade (SPEC-012). Texto livre: agrupa e filtra
 * por uma chave normalizada (sem acento, caixa ou espaços extras) e exibe a grafia mais usada.
 */

/** Valor do filtro `?cidade=` para Sales cujo Customer não tem cidade. */
export const NO_CITY = "__none__";
export const NO_CITY_LABEL = "Sem cidade";

/** Chave de agrupamento: "  São  Paulo " e "sao paulo" → "sao paulo"; vazio → NO_CITY. */
export function cityKey(raw: string | null | undefined): string {
  const key = (raw ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return key || NO_CITY;
}

export interface CityIndex {
  /** cliente_id → chave da cidade */
  keyByCustomer: Map<string, string>;
  /** chave → rótulo exibido (grafia mais frequente entre os Customers) */
  labelByKey: Map<string, string>;
}

export function buildCityIndex(clientes: Cliente[]): CityIndex {
  const keyByCustomer = new Map<string, string>();
  const spellings = new Map<string, Map<string, number>>();
  for (const c of clientes) {
    const key = cityKey(c.cidade);
    keyByCustomer.set(c.id, key);
    if (key === NO_CITY) continue;
    const label = (c.cidade ?? "").replace(/\s+/g, " ").trim();
    const counts = spellings.get(key) ?? new Map<string, number>();
    counts.set(label, (counts.get(label) ?? 0) + 1);
    spellings.set(key, counts);
  }
  const labelByKey = new Map<string, string>([[NO_CITY, NO_CITY_LABEL]]);
  for (const [key, counts] of spellings) {
    const best = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"),
    )[0][0];
    labelByKey.set(key, best);
  }
  return { keyByCustomer, labelByKey };
}

/** Chave da cidade do Customer (desconhecido → NO_CITY). */
export function customerCityKey(customerId: string, index: CityIndex): string {
  return index.keyByCustomer.get(customerId) ?? NO_CITY;
}

export function cityLabel(key: string, index: CityIndex): string {
  return index.labelByKey.get(key) ?? key;
}

/** Ordem: alfabética (pt-BR), "Sem cidade" por último. */
function compareCities(a: { key: string; label: string }, b: { key: string; label: string }) {
  if (a.key === NO_CITY) return b.key === NO_CITY ? 0 : 1;
  if (b.key === NO_CITY) return -1;
  return a.label.localeCompare(b.label, "pt-BR");
}

export interface CityOption {
  key: string;
  label: string;
  count: number;
}

/**
 * Opções do filtro: cidades presentes nas linhas já filtradas pelos demais filtros, com a
 * contagem. A cidade selecionada entra mesmo sem linhas (count 0), para não sumir do select.
 */
export function cityOptions<T>(
  rows: T[],
  getCustomerId: (row: T) => string,
  index: CityIndex,
  selected: string,
): CityOption[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = customerCityKey(getCustomerId(r), index);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (selected && !counts.has(selected)) counts.set(selected, 0);
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: cityLabel(key, index), count }))
    .sort(compareCities);
}

export interface CityGroup<T> {
  key: string;
  label: string;
  rows: T[];
}

/** Agrupa mantendo a ordem da API dentro de cada cidade. */
export function groupByCity<T>(
  rows: T[],
  getCustomerId: (row: T) => string,
  index: CityIndex,
): CityGroup<T>[] {
  const groups = new Map<string, CityGroup<T>>();
  for (const r of rows) {
    const key = customerCityKey(getCustomerId(r), index);
    let g = groups.get(key);
    if (!g) {
      g = { key, label: cityLabel(key, index), rows: [] };
      groups.set(key, g);
    }
    g.rows.push(r);
  }
  return [...groups.values()].sort(compareCities);
}

export interface SalesSummary {
  /** Somas sem as Sales canceladas (RN-04: canceladas não entram em totais). */
  total: number;
  receivable: number;
  profit: number;
  toDeliver: number;
}

export function summarizeSales(vendas: Venda[]): SalesSummary {
  const s: SalesSummary = { total: 0, receivable: 0, profit: 0, toDeliver: 0 };
  for (const v of vendas) {
    if (v.delivery_status === "CANCELED") continue;
    s.total += v.total_venda;
    s.receivable += v.receivable;
    s.profit += v.lucro;
    if (v.delivery_status === "TO_DELIVER") s.toDeliver += 1;
  }
  return s;
}

export interface QuotesSummary {
  /** Σ total dos Quotes abertos (o que ainda está em negociação). */
  openTotal: number;
  byStatus: Record<QuoteStatus, number>;
}

export function summarizeQuotes(quotes: Quote[]): QuotesSummary {
  const s: QuotesSummary = { openTotal: 0, byStatus: { OPEN: 0, WON: 0, LOST: 0 } };
  for (const q of quotes) {
    s.byStatus[q.status] += 1;
    if (q.status === "OPEN") s.openTotal += q.total_quote;
  }
  return s;
}
