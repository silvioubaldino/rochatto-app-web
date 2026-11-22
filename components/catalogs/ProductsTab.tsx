"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import type { Produto } from "@/lib/types";
import { useProdutos } from "@/hooks/useProdutos";
import { useProductCategories } from "@/hooks/useProductCategories";
import { formatMoeda } from "@/lib/formatters";
import { DataTable } from "@/components/tables/DataTable";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ProdutoModal } from "@/components/forms/ProdutoModal";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";

export function ProductsTab() {
  const [categoryFilter, setCategoryFilter] = useState("");
  const { produtos, isLoading, refresh } = useProdutos({
    category_id: categoryFilter || undefined,
  });
  const { categories, isLoading: categoriesLoading } = useProductCategories();
  const activeCategoryIds = new Set(categories.map((c) => c.id));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<Produto | null>(null);

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      await api.delete(`/produtos/${deleting.id}`);
      toast.success("Produto excluído com sucesso.");
      refresh();
    } catch (err) {
      toast.error(
        err instanceof APIError ? err.message : "Erro ao excluir produto.",
      );
    } finally {
      setDeleteOpen(false);
      setDeleting(null);
    }
  }, [deleting, refresh]);

  const columns = [
    { key: "nome" as const, header: "Nome" },
    {
      key: "category_name" as const,
      header: "Categoria",
      render: (row: Produto) => {
        if (!row.category_id) return "—";
        const name = row.category_name || "—";
        // Categoria excluída (soft-delete) segue exibida pelo nome, marcada como inativa.
        return categoriesLoading || activeCategoryIds.has(row.category_id) ? (
          name
        ) : (
          <span className="text-muted-foreground">{name} (inativa)</span>
        );
      },
    },
    {
      key: "unidade" as const,
      header: "Unidade",
      render: (row: Produto) => row.unidade || "—",
    },
    {
      key: "preco_referencia" as const,
      header: "Preço Ref.",
      render: (row: Produto) =>
        row.preco_referencia ? formatMoeda(row.preco_referencia) : "—",
    },
    {
      key: "custo_referencia" as const,
      header: "Custo Ref.",
      render: (row: Produto) =>
        row.custo_referencia ? formatMoeda(row.custo_referencia) : "—",
    },
    {
      key: "actions",
      header: "Ações",
      width: "100px",
      render: (row: Produto) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setEditing(row);
              setModalOpen(true);
            }}
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setDeleting(row);
              setDeleteOpen(true);
            }}
            title="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <select
          aria-label="Filtrar por categoria"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm sm:w-56"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button
          onClick={() => {
            setEditing(undefined);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={produtos}
        isLoading={isLoading}
        emptyMessage={
          categoryFilter ? "Nenhum produto nesta categoria." : "Nenhum produto cadastrado."
        }
      />

      <ProdutoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        produto={editing}
        onSuccess={refresh}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleting(null);
        }}
        onConfirm={handleDelete}
        title="Excluir produto"
        description={`Tem certeza que deseja excluir ${deleting?.nome ?? "este produto"}?`}
      />
    </div>
  );
}
