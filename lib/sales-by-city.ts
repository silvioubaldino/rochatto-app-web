import type { Cliente, Venda } from "@/lib/types";

/**
 * Cidade da Sale = `cidade` do Customer (RF-01: cidade/endereço da obra), juntada no cliente
 * por `cliente_id` — `GET /vendas` não traz a cidade (SPEC-012). Texto livre: agrupa e filtra
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

export function saleCityKey(venda: Venda, index: CityIndex): string {
  return index.keyByCustomer.get(venda.cliente_id) ?? NO_CITY;
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
 * Opções do filtro: cidades presentes nas Sales já filtradas pelos demais filtros, com a
 * contagem. A cidade selecionada entra mesmo sem Sales (count 0), para não sumir do select.
 */
export function cityOptions(vendas: Venda[], index: CityIndex, selected: string): CityOption[] {
  const counts = new Map<string, number>();
  for (const v of vendas) {
    const key = saleCityKey(v, index);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (selected && !counts.has(selected)) counts.set(selected, 0);
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: cityLabel(key, index), count }))
    .sort(compareCities);
}

export interface CityGroup {
  key: string;
  label: string;
  vendas: Venda[];
  /** Somas sem as Sales canceladas (RN-04: canceladas não entram em totais). */
  total: number;
  receivable: number;
  profit: number;
  toDeliver: number;
}

/** Agrupa mantendo a ordem da API dentro de cada cidade. */
export function groupByCity(vendas: Venda[], index: CityIndex): CityGroup[] {
  const groups = new Map<string, CityGroup>();
  for (const v of vendas) {
    const key = saleCityKey(v, index);
    let g = groups.get(key);
    if (!g) {
      g = { key, label: cityLabel(key, index), vendas: [], total: 0, receivable: 0, profit: 0, toDeliver: 0 };
      groups.set(key, g);
    }
    g.vendas.push(v);
    if (v.delivery_status === "CANCELED") continue;
    g.total += v.total_venda;
    g.receivable += v.receivable;
    g.profit += v.lucro;
    if (v.delivery_status === "TO_DELIVER") g.toDeliver += 1;
  }
  return [...groups.values()].sort(compareCities);
}
