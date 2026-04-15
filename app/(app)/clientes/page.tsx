"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useClientes } from "@/hooks/useClientes";
import { api, APIError } from "@/lib/api";
import type { Cliente } from "@/lib/types";
import { DataTable } from "@/components/tables/DataTable";
import { ClienteModal } from "@/components/forms/ClienteModal";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

export default function ClientesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { clientes, isLoading, refresh } = useClientes(
    debouncedSearch || undefined,
  );

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | undefined>();

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCliente, setDeletingCliente] = useState<Cliente | null>(null);

  function handleNew() {
    setEditingCliente(undefined);
    setModalOpen(true);
  }

  function handleEdit(cliente: Cliente) {
    setEditingCliente(cliente);
    setModalOpen(true);
  }

  function handleDeleteClick(cliente: Cliente) {
    setDeletingCliente(cliente);
    setDeleteDialogOpen(true);
  }

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingCliente) return;
    try {
      await api.delete(`/clientes/${deletingCliente.id}`);
      toast.success("Cliente excluído com sucesso.");
      refresh();
    } catch (err) {
      const message =
        err instanceof APIError ? err.message : "Erro ao excluir cliente.";
      toast.error(message);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingCliente(null);
    }
  }, [deletingCliente, refresh]);

  const columns = [
    { key: "nome" as const, header: "Nome" },
    { key: "cidade" as const, header: "Cidade" },
    {
      key: "telefone" as const,
      header: "Telefone",
      render: (row: Cliente) => row.telefone || "—",
    },
    {
      key: "actions" as string,
      header: "Ações",
      width: "100px",
      render: (row: Cliente) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(row);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <DataTable
        columns={columns}
        data={clientes}
        isLoading={isLoading}
        emptyMessage="Nenhum cliente encontrado."
        onRowClick={(row) => router.push(`/clientes/${row.id}`)}
      />

      <ClienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        cliente={editingCliente}
        onSuccess={refresh}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeletingCliente(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Excluir cliente"
        description={`Tem certeza que deseja excluir ${deletingCliente?.nome ?? "este cliente"}?`}
      />
    </div>
  );
}
