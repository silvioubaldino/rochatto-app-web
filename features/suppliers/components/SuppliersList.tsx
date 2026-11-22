"use client";

import { Suspense } from "react";
import { CatalogList } from "@/components/entity/catalog-list";
import { EntityFormDialog } from "@/components/entity/EntityFormDialog";
import { normalizeText } from "@/components/entity/entity-model";
import { FilterBar } from "@/components/patterns/FilterBar";
import { useUrlFilters } from "@/components/patterns/useUrlFilters";
import { useFornecedores } from "@/hooks/useFornecedores";
import { SUPPLIER_KINDS, SUPPLIER_KIND_LABELS } from "@/lib/format";
import type { Fornecedor, SupplierKind } from "@/lib/types";
import { useDeleteSupplier } from "../mutations";
import { SupplierForm } from "./SupplierForm";

const SPEC = { q: {}, kind: {} } as const;
const CHIPS = [{ value: "", label: "Todos" }, ...SUPPLIER_KINDS.map((k) => ({ value: k, label: SUPPLIER_KIND_LABELS[k] }))];

function Content() {
  const f = useUrlFilters(SPEC);
  const kind = (SUPPLIER_KINDS as string[]).includes(f.values.kind) ? (f.values.kind as SupplierKind) : undefined;
  const { fornecedores, isLoading, error, refresh } = useFornecedores(kind);
  const remove = useDeleteSupplier();
  const q = normalizeText(f.values.q);
  const rows = q ? fornecedores.filter((s) => normalizeText(`${s.nome} ${s.cidade ?? ""}`).includes(q)) : fornecedores;
  return (
    <CatalogList<Fornecedor>
      caption="Fornecedores e prestadores"
      rows={rows}
      rowKey={(s) => s.id}
      rowHref={(s) => `/fornecedores/${s.id}`}
      nameOf={(s) => s.nome}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refresh()}
      empty={{ title: f.activeCount > 0 ? "Nenhum fornecedor encontrado." : "Nenhum fornecedor ou prestador cadastrado." }}
      createLabel="Novo fornecedor"
      toolbar={
        <FilterBar
          chips={[{ label: "Tipo", options: CHIPS, value: f.values.kind, onChange: (k) => f.set({ kind: k }) }]}
          search={{ value: f.values.q, onChange: (q) => f.set({ q }), placeholder: "Buscar por nome ou cidade" }}
          activeCount={f.activeCount}
          onClear={f.clear}
        />
      }
      columns={[
        { id: "nome", header: "Nome", phone: "title", sortValue: (s) => s.nome, cell: (s) => s.nome },
        { id: "kind", header: "Tipo", phone: "subtitle", cell: (s) => SUPPLIER_KIND_LABELS[s.kind] ?? "—" },
        { id: "city", header: "Cidade", phone: "meta", sortValue: (s) => s.cidade ?? "", cell: (s) => s.cidade || "—" },
        { id: "phone", header: "Telefone", phone: "meta", cell: (s) => s.telefone || "—" },
      ]}
      renderForm={({ entity, onClose }) => <EntityFormDialog<"supplier"> open onClose={onClose} titles={{ create: "Novo fornecedor ou prestador", edit: "Editar fornecedor" }} Form={SupplierForm} entity={entity} />}
      onDelete={(s) => remove.mutateAsync(s.id)}
      deleteTitle="Excluir fornecedor"
      deleteDescription={(s) => `Excluir ${s.nome}? Compras e contas já feitas mantêm o histórico.`}
    />
  );
}

export function SuppliersList() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
