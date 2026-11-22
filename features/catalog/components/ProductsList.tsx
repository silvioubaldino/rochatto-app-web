"use client";

import { Suspense } from "react";
import { CatalogList } from "@/components/entity/catalog-list";
import { EntityFormDialog } from "@/components/entity/EntityFormDialog";
import { normalizeText } from "@/components/entity/entity-model";
import { FieldShell } from "@/components/patterns/fields";
import { FilterBar } from "@/components/patterns/FilterBar";
import { Select } from "@/components/patterns/Select";
import { useUrlFilters } from "@/components/patterns/useUrlFilters";
import { MoneyText } from "@/components/patterns/values";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useProdutos } from "@/hooks/useProdutos";
import type { Produto } from "@/lib/types";
import { useDeleteProduct } from "../mutations";
import { ProductForm } from "./ProductForm";

const SPEC = { q: {}, category_id: {} } as const;

function Content() {
  const f = useUrlFilters(SPEC);
  const { produtos, isLoading, error, refresh } = useProdutos({ category_id: f.values.category_id || undefined });
  const { categories, isLoading: categoriesLoading } = useProductCategories();
  const remove = useDeleteProduct();
  const activeIds = new Set(categories.map((c) => c.id));
  const q = normalizeText(f.values.q);
  const rows = q ? produtos.filter((p) => normalizeText(`${p.nome} ${p.category_name ?? ""}`).includes(q)) : produtos;

  return (
    <CatalogList<Produto>
      caption="Produtos"
      rows={rows}
      rowKey={(p) => p.id}
      nameOf={(p) => p.nome}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refresh()}
      empty={{ title: f.activeCount > 0 ? "Nenhum produto encontrado." : "Nenhum produto cadastrado." }}
      createLabel="Novo produto"
      toolbar={
        <FilterBar
          search={{ value: f.values.q, onChange: (q) => f.set({ q }), placeholder: "Buscar produto ou categoria" }}
          activeCount={f.activeCount}
          onClear={f.clear}
        >
          <FieldShell label="Categoria" htmlFor="pf-cat">
            <Select id="pf-cat" value={f.values.category_id} onChange={(category_id) => f.set({ category_id })} options={[{ value: "", label: "Todas as categorias" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} />
          </FieldShell>
        </FilterBar>
      }
      columns={[
        { id: "nome", header: "Nome", phone: "title", sortValue: (p) => p.nome, cell: (p) => p.nome },
        {
          id: "category",
          header: "Categoria",
          phone: "subtitle",
          sortValue: (p) => p.category_name ?? "",
          cell: (p) =>
            !p.category_id ? "—" : categoriesLoading || activeIds.has(p.category_id) ? (p.category_name ?? "—") : <span className="text-muted-foreground">{p.category_name} (inativa)</span>,
        },
        { id: "unit", header: "Unidade", phone: "meta", cell: (p) => p.unidade || "—" },
        { id: "price", header: "Preço ref.", phone: "value", align: "right", sortValue: (p) => p.preco_referencia ?? 0, cell: (p) => (p.preco_referencia ? <MoneyText value={p.preco_referencia} /> : "—") },
        { id: "cost", header: "Custo ref.", phone: "hidden", align: "right", sortValue: (p) => p.custo_referencia ?? 0, cell: (p) => (p.custo_referencia ? <MoneyText value={p.custo_referencia} /> : "—") },
        { id: "supplier", header: "Fornecedor habitual", phone: "meta", cell: (p) => p.default_supplier_name || "—" },
      ]}
      renderForm={({ entity, onClose }) => <EntityFormDialog<"product"> open onClose={onClose} titles={{ create: "Novo produto", edit: "Editar produto" }} Form={ProductForm} entity={entity} />}
      onDelete={(p) => remove.mutateAsync(p.id)}
      deleteTitle="Excluir produto"
      deleteDescription={(p) => `Excluir ${p.nome}? Orçamentos e vendas já feitos mantêm o histórico.`}
    />
  );
}

export function ProductsList() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
