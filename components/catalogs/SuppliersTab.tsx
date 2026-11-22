"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import type { Fornecedor, SupplierKind } from "@/lib/types";
import { useFornecedores } from "@/hooks/useFornecedores";
import { SUPPLIER_KINDS, SUPPLIER_KIND_LABELS } from "@/lib/formatters";
import { DataTable } from "@/components/tables/DataTable";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { FornecedorModal } from "@/components/forms/FornecedorModal";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";

export function SuppliersTab() {
  const [kindFilter, setKindFilter] = useState<SupplierKind | "">("");
  const { fornecedores, isLoading, refresh } = useFornecedores(kindFilter || undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<Fornecedor | null>(null);

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      await api.delete(`/fornecedores/${deleting.id}`);
      toast.success("Fornecedor excluído com sucesso.");
      refresh();
    } catch (err) {
      toast.error(
        err instanceof APIError ? err.message : "Erro ao excluir fornecedor.",
      );
    } finally {
      setDeleteOpen(false);
      setDeleting(null);
    }
  }, [deleting, refresh]);

  const columns = [
    { key: "nome" as const, header: "Nome" },
    {
      key: "kind" as const,
      header: "Tipo",
      render: (row: Fornecedor) => SUPPLIER_KIND_LABELS[row.kind] ?? "—",
    },
    {
      key: "cidade" as const,
      header: "Cidade",
      render: (row: Fornecedor) => row.cidade || "—",
    },
    {
      key: "telefone" as const,
      header: "Telefone",
      render: (row: Fornecedor) => row.telefone || "—",
    },
    {
      key: "actions",
      header: "Ações",
      width: "100px",
      render: (row: Fornecedor) => (
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <label htmlFor="supplier-kind" className="text-xs font-medium text-muted-foreground">
            Tipo
          </label>
          <select
            id="supplier-kind"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as SupplierKind | "")}
            className="h-8 w-48 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Todos</option>
            {SUPPLIER_KINDS.map((k) => (
              <option key={k} value={k}>
                {SUPPLIER_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo fornecedor / prestador
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={fornecedores}
        isLoading={isLoading}
        emptyMessage="Nenhum fornecedor cadastrado."
      />

      <FornecedorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        fornecedor={editing}
        onSuccess={refresh}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleting(null);
        }}
        onConfirm={handleDelete}
        title="Excluir fornecedor"
        description={`Tem certeza que deseja excluir ${deleting?.nome ?? "este fornecedor"}?`}
      />
    </div>
  );
}
