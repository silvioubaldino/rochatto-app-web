"use client";

import { useState, useCallback } from "react";
import { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import type { ProductCategory } from "@/lib/types";
import { useProductCategories } from "@/hooks/useProductCategories";
import { DataTable } from "@/components/tables/DataTable";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ProductCategoryModal } from "@/components/forms/ProductCategoryModal";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";

function revalidateProdutos() {
  return globalMutate(
    (key) => typeof key === "string" && key.startsWith("/produtos"),
  );
}

export function CategoriesTab() {
  const { categories, isLoading, refresh } = useProductCategories();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<ProductCategory | null>(null);

  const afterChange = useCallback(() => {
    refresh();
    revalidateProdutos();
  }, [refresh]);

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      await api.delete(`/product-categories/${deleting.id}`);
      toast.success("Categoria excluída com sucesso.");
      afterChange();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao excluir categoria.");
    } finally {
      setDeleteOpen(false);
      setDeleting(null);
    }
  }, [deleting, afterChange]);

  const columns = [
    { key: "name" as const, header: "Nome" },
    {
      key: "actions",
      header: "Ações",
      width: "100px",
      render: (row: ProductCategory) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setEditing(row);
              setModalOpen(true);
            }}
            title="Renomear"
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
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(undefined);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={categories}
        isLoading={isLoading}
        emptyMessage="Nenhuma categoria cadastrada."
      />

      <ProductCategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        category={editing}
        onSuccess={afterChange}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleting(null);
        }}
        onConfirm={handleDelete}
        title="Excluir categoria"
        description={`Tem certeza que deseja excluir ${deleting?.name ?? "esta categoria"}? Os produtos que a usam continuam vinculados e ela aparece como inativa.`}
      />
    </div>
  );
}
