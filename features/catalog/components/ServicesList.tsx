"use client";

import { Suspense } from "react";
import { CatalogList } from "@/components/entity/catalog-list";
import { EntityFormDialog } from "@/components/entity/EntityFormDialog";
import { FilterBar } from "@/components/patterns/FilterBar";
import { useUrlFilters } from "@/components/patterns/useUrlFilters";
import { MoneyText } from "@/components/patterns/values";
import { useServices } from "@/hooks/useServices";
import type { Service } from "@/lib/types";
import { useDeleteService } from "../mutations";
import { ServiceForm } from "./ServiceForm";

const SPEC = { q: {} } as const;

function Content() {
  const f = useUrlFilters(SPEC);
  const { services, isLoading, error, refresh } = useServices(f.values.q || undefined);
  const remove = useDeleteService();
  return (
    <CatalogList<Service>
      caption="Serviços"
      rows={services}
      rowKey={(s) => s.id}
      nameOf={(s) => s.name}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refresh()}
      empty={{ title: f.values.q ? "Nenhum serviço encontrado." : "Nenhum serviço cadastrado." }}
      createLabel="Novo serviço"
      toolbar={<FilterBar search={{ value: f.values.q, onChange: (q) => f.set({ q }), placeholder: "Buscar serviço" }} />}
      columns={[
        { id: "name", header: "Nome", phone: "title", sortValue: (s) => s.name, cell: (s) => s.name },
        { id: "unit", header: "Unidade", phone: "meta", cell: (s) => s.unit || "—" },
        { id: "price", header: "Preço ref.", phone: "value", align: "right", sortValue: (s) => s.reference_price ?? 0, cell: (s) => (s.reference_price ? <MoneyText value={s.reference_price} /> : "—") },
        { id: "cost", header: "Custo ref.", phone: "meta", align: "right", sortValue: (s) => s.reference_cost ?? 0, cell: (s) => (s.reference_cost ? <MoneyText value={s.reference_cost} /> : "—") },
      ]}
      renderForm={({ entity, onClose }) => <EntityFormDialog<"service"> open onClose={onClose} titles={{ create: "Novo serviço", edit: "Editar serviço" }} Form={ServiceForm} entity={entity} />}
      onDelete={(s) => remove.mutateAsync(s.id)}
      deleteTitle="Excluir serviço"
      deleteDescription={(s) => `Excluir ${s.name}? Orçamentos e vendas já feitos mantêm o histórico.`}
    />
  );
}

/** Catálogo de Services (T16). */
export function ServicesList() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
