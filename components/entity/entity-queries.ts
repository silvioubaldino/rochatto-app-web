"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { PARTNER_TYPE_LABELS, SUPPLIER_KIND_LABELS } from "@/lib/format";
import type { Cliente, Fornecedor, Partner, Produto, Service } from "@/lib/types";
import { normalizeText, type EntityKind } from "./entity-model";

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
  description?: string;
  raw: EntityRawMap[K];
}

interface Source<K extends EntityKind> {
  listKey: (query: string) => string;
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

export function useEntityOptions<K extends EntityKind>(kind: K, query: string, enabled = true) {
  const source = SOURCES[kind] as Source<K>;
  const key = enabled ? source.listKey(source.serverSearch ? query : "") : null;
  const { data, error, isLoading } = useSWR<EntityRawMap[K][]>(key, api.get, { keepPreviousData: true });
  const all = Array.isArray(data) ? data.map(source.toOption) : [];
  const q = normalizeText(query);
  const options = source.serverSearch || !q ? all : all.filter((o) => normalizeText(o.label).includes(q));
  return { options, isLoading, error };
}

export function useEntityById<K extends EntityKind>(kind: K, id: string | null | undefined) {
  const source = SOURCES[kind] as Source<K>;
  const { data, error, isLoading } = useSWR<EntityRawMap[K]>(id ? source.itemKey(id) : null, api.get);
  return { option: data ? source.toOption(data) : null, isLoading, error };
}

export function useCatalogUnits(enabled = true) {
  const products = useSWR<Produto[]>(enabled ? "/produtos" : null, api.get);
  const services = useSWR<Service[]>(enabled ? "/services" : null, api.get);
  const units = new Map<string, string>();
  for (const p of products.data ?? []) if (p.unidade) units.set(p.id, p.unidade);
  for (const s of services.data ?? []) if (s.unit) units.set(s.id, s.unit);
  return units;
}

export function useAllCustomers() {
  const { data, isLoading } = useSWR<Cliente[]>("/clientes", api.get);
  return { customers: data ?? [], isLoading };
}
