"use client";

import { Suspense } from "react";
import { CatalogList } from "@/components/entity/catalog-list";
import { EntityFormDialog } from "@/components/entity/EntityFormDialog";
import { FilterBar } from "@/components/patterns/FilterBar";
import { useUrlFilters } from "@/components/patterns/useUrlFilters";
import { usePartners } from "@/hooks/usePartners";
import { PARTNER_TYPES, PARTNER_TYPE_LABELS } from "@/lib/format";
import type { Partner, PartnerType } from "@/lib/types";
import { useDeletePartner } from "../mutations";
import { PartnerForm } from "./PartnerForm";

const SPEC = { q: {}, type: {} } as const;
const CHIPS = [{ value: "", label: "Todos" }, ...PARTNER_TYPES.map((t) => ({ value: t, label: PARTNER_TYPE_LABELS[t] }))];

function Content() {
  const f = useUrlFilters(SPEC);
  const type = (PARTNER_TYPES as string[]).includes(f.values.type) ? (f.values.type as PartnerType) : undefined;
  const { partners, isLoading, error, refresh } = usePartners({ q: f.values.q || undefined, type });
  const remove = useDeletePartner();
  return (
    <CatalogList<Partner>
      caption="Parceiros"
      rows={partners}
      rowKey={(p) => p.id}
      rowHref={(p) => `/parceiros/${p.id}`}
      nameOf={(p) => p.name}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refresh()}
      empty={{ title: f.activeCount > 0 ? "Nenhum parceiro encontrado." : "Nenhum parceiro cadastrado." }}
      createLabel="Novo parceiro"
      toolbar={
        <FilterBar
          chips={[{ label: "Tipo", options: CHIPS, value: f.values.type, onChange: (t) => f.set({ type: t }) }]}
          search={{ value: f.values.q, onChange: (q) => f.set({ q }), placeholder: "Buscar parceiro por nome" }}
          activeCount={f.activeCount}
          onClear={f.clear}
        />
      }
      columns={[
        { id: "name", header: "Nome", phone: "title", sortValue: (p) => p.name, cell: (p) => p.name },
        { id: "type", header: "Tipo", phone: "subtitle", cell: (p) => PARTNER_TYPE_LABELS[p.type] ?? "—" },
        { id: "phone", header: "Telefone", phone: "meta", cell: (p) => p.phone || "—" },
      ]}
      renderForm={({ entity, onClose }) => <EntityFormDialog<"partner"> open onClose={onClose} titles={{ create: "Novo parceiro", edit: "Editar parceiro" }} Form={PartnerForm} entity={entity} />}
      onDelete={(p) => remove.mutateAsync(p.id)}
      deleteTitle="Excluir parceiro"
      deleteDescription={(p) => `Excluir ${p.name}? Clientes, orçamentos e vendas já vinculados mantêm o histórico.`}
    />
  );
}

export function PartnersList() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
