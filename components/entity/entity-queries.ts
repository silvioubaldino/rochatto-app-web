"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { PARTNER_TYPE_LABELS, SUPPLIER_KIND_LABELS } from "@/lib/format";
import type { Cliente, Fornecedor, Partner, Produto, Service } from "@/lib/types";
import { normalizeText, type EntityKind } from "./entity-model";

/** O registro cru da api de cada entidade selecionável. */
export interface EntityRawMap {
  customer: Cliente;
  product: Produto;
  service: Service;
  supplier: Fornecedor;
  partner: Partner;
}

export interface EntityOption<K extends EntityKind = EntityKind> {
  id: string;
  label: string;
  /** Linha secundária: cidade, tipo, unidade… */
  description?: string;
  raw: EntityRawMap[K];
}

interface Source<K extends EntityKind> {
  /** Chave SWR (= caminho da api, para a invalidação por eventos casar) da lista. */
  listKey: (query: string) => string;
  /** O servidor já filtra por `query`? Senão filtramos no cliente. */
  serverSearch: boolean;
  itemKey: (id: string) => string;
  toOption: (raw: EntityRawMap[K]) => EntityOption<K>;
}

const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" · ") || undefined;

const SOURCES: { [K in EntityKind]: Source<K> } = {
  customer: {
    listKey: (q) => (q ? `/clientes/search?q=${encodeURIComponent(q)}` : "/clientes"),
    serverSearch: true,
    itemKey: (id) => `/clientes/${id}`,
    toOption: (c) => ({ id: c.id, label: c.nome, description: join(c.cidade, c.telefone), raw: c }),
  },
  product: {
    listKey: () => "/produtos",
    serverSearch: false,
    itemKey: (id) => `/produtos/${id}`,
    toOption: (p) => ({ id: p.id, label: p.nome, description: join(p.category_name, p.unidade), raw: p }),
  },
  service: {
    listKey: (q) => (q ? `/services?q=${encodeURIComponent(q)}` : "/services"),
    serverSearch: true,
    itemKey: (id) => `/services/${id}`,
    toOption: (s) => ({ id: s.id, label: s.name, description: join("Serviço", s.unit), raw: s }),
  },
  supplier: {
    listKey: () => "/fornecedores",
    serverSearch: false,
    itemKey: (id) => `/fornecedores/${id}`,
    toOption: (s) => ({
      id: s.id,
      label: s.nome,
      description: join(s.kind ? SUPPLIER_KIND_LABELS[s.kind] : undefined, s.cidade),
      raw: s,
    }),
  },
  partner: {
    listKey: (q) => (q ? `/partners?q=${encodeURIComponent(q)}` : "/partners"),
    serverSearch: true,
    itemKey: (id) => `/partners/${id}`,
    toOption: (p) => ({ id: p.id, label: p.name, description: PARTNER_TYPE_LABELS[p.type], raw: p }),
  },
};

export function toEntityOption<K extends EntityKind>(kind: K, raw: EntityRawMap[K]): EntityOption<K> {
  return (SOURCES[kind] as Source<K>).toOption(raw);
}

/**
 * Opções de uma entidade para o combobox. Lê pela mesma chave SWR das listas do app, então
 * um evento de domínio (CATALOG_CHANGED…) revalida o seletor junto com o resto.
 * `query` é a busca JÁ com debounce (o combobox cuida disso).
 */
export function useEntityOptions<K extends EntityKind>(kind: K, query: string, enabled = true) {
  const source = SOURCES[kind] as Source<K>;
  const key = enabled ? source.listKey(source.serverSearch ? query : "") : null;
  const { data, error, isLoading } = useSWR<EntityRawMap[K][]>(key, api.get, { keepPreviousData: true });
  const all = Array.isArray(data) ? data.map(source.toOption) : [];
  const q = normalizeText(query);
  const options = source.serverSearch || !q ? all : all.filter((o) => normalizeText(o.label).includes(q));
  return { options, isLoading, error };
}

/** Um registro pelo id (mostra o NOME do que veio da URL/valor salvo — F18). */
export function useEntityById<K extends EntityKind>(kind: K, id: string | null | undefined) {
  const source = SOURCES[kind] as Source<K>;
  const { data, error, isLoading } = useSWR<EntityRawMap[K]>(id ? source.itemKey(id) : null, api.get);
  return { option: data ? source.toOption(data) : null, isLoading, error };
}

/** Unidade por produto e por serviço (a Quote não grava a unidade no Item). Mesmas chaves das listas. */
export function useCatalogUnits(enabled = true) {
  const products = useSWR<Produto[]>(enabled ? "/produtos" : null, api.get);
  const services = useSWR<Service[]>(enabled ? "/services" : null, api.get);
  const units = new Map<string, string>();
  for (const p of products.data ?? []) if (p.unidade) units.set(p.id, p.unidade);
  for (const s of services.data ?? []) if (s.unit) units.set(s.id, s.unit);
  return units;
}

/** Todos os Customers (`GET /clientes`) — para juntar a cidade nas listas de Sale e Quote. */
export function useAllCustomers() {
  const { data, isLoading } = useSWR<Cliente[]>("/clientes", api.get);
  return { customers: data ?? [], isLoading };
}
