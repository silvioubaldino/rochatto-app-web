"use client";

import { Suspense } from "react";
import { CatalogList } from "@/components/entity/catalog-list";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import { EntityFormDialog } from "@/components/entity/EntityFormDialog";
import { FieldShell } from "@/components/patterns/fields";
import { FilterBar } from "@/components/patterns/FilterBar";
import { useUrlFilters } from "@/components/patterns/useUrlFilters";
import { useClientes } from "@/hooks/useClientes";
import { LEAD_SOURCES, LEAD_SOURCE_LABELS, formatLeadSource } from "@/lib/format";
import type { Cliente, LeadSource } from "@/lib/types";
import { useDeleteCustomer } from "../mutations";
import { CustomerForm } from "./CustomerForm";

const SPEC = { q: {}, lead_source: {}, referrer_id: {} } as const;
const CHIPS = [{ value: "", label: "Todas" }, ...LEAD_SOURCES.map((s) => ({ value: s, label: LEAD_SOURCE_LABELS[s] }))];

function Content() {
  const f = useUrlFilters(SPEC);
  const source = (LEAD_SOURCES as string[]).includes(f.values.lead_source) ? (f.values.lead_source as LeadSource) : undefined;
  const { clientes, isLoading, error, refresh } = useClientes(f.values.q || undefined, {
    lead_source: source,
    referrer_id: source === "PARTNER" ? f.values.referrer_id || undefined : undefined,
  });
  const remove = useDeleteCustomer();
  return (
    <CatalogList<Cliente>
      caption="Clientes"
      rows={clientes}
      rowKey={(c) => c.id}
      rowHref={(c) => `/clientes/${c.id}`}
      nameOf={(c) => c.nome}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refresh()}
      empty={{ title: f.activeCount > 0 ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado." }}
      createLabel="Novo cliente"
      toolbar={
        <FilterBar
          chips={[{ label: "Origem", options: CHIPS, value: f.values.lead_source, onChange: (s) => f.set({ lead_source: s, referrer_id: "" }) }]}
          search={{ value: f.values.q, onChange: (q) => f.set({ q }), placeholder: "Buscar cliente por nome" }}
          activeCount={f.activeCount}
          onClear={f.clear}
        >
          {source === "PARTNER" && (
            <FieldShell label="Parceiro" htmlFor="cf-partner">
              <EntityCombobox kind="partner" id="cf-partner" value={f.values.referrer_id} allowCreate={false} placeholder="Todos os parceiros" onChange={(id) => f.set({ referrer_id: id })} />
            </FieldShell>
          )}
        </FilterBar>
      }
      columns={[
        { id: "nome", header: "Nome", phone: "title", sortValue: (c) => c.nome, cell: (c) => c.nome },
        { id: "city", header: "Cidade", phone: "subtitle", sortValue: (c) => c.cidade ?? "", cell: (c) => c.cidade || "—" },
        { id: "phone", header: "Telefone", phone: "meta", cell: (c) => c.telefone || "—" },
        { id: "source", header: "Origem", phone: "meta", cell: (c) => formatLeadSource(c.lead_source, c.referrer_name) },
      ]}
      renderForm={({ entity, onClose }) => <EntityFormDialog<"customer"> open onClose={onClose} titles={{ create: "Novo cliente", edit: "Editar cliente" }} Form={CustomerForm} entity={entity} />}
      onDelete={(c) => remove.mutateAsync(c.id)}
      deleteTitle="Excluir cliente"
      deleteDescription={(c) => `Excluir ${c.nome}? Orçamentos e vendas já feitos mantêm o histórico.`}
    />
  );
}

export function CustomersList() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
