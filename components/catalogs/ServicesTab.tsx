"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import type { Service } from "@/lib/types";
import { useServices } from "@/hooks/useServices";
import { formatMoeda } from "@/lib/formatters";
import { DataTable } from "@/components/tables/DataTable";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ServiceModal } from "@/components/forms/ServiceModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

export function ServicesTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const { services, isLoading, refresh } = useServices(debouncedSearch || undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<Service | null>(null);

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      await api.delete(`/services/${deleting.id}`);
      toast.success("Serviço excluído com sucesso.");
      refresh();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao excluir serviço.");
    } finally {
      setDeleteOpen(false);
      setDeleting(null);
    }
  }, [deleting, refresh]);

  const columns = [
    { key: "name" as const, header: "Nome" },
    { key: "unit" as const, header: "Unidade", render: (row: Service) => row.unit || "—" },
    {
      key: "reference_price" as const,
      header: "Preço Ref.",
      render: (row: Service) => (row.reference_price ? formatMoeda(row.reference_price) : "—"),
    },
    {
      key: "reference_cost" as const,
      header: "Custo Ref.",
      render: (row: Service) => (row.reference_cost ? formatMoeda(row.reference_cost) : "—"),
    },
    {
      key: "actions",
      header: "Ações",
      width: "100px",
      render: (row: Service) => (
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo serviço
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={services}
        isLoading={isLoading}
        emptyMessage="Nenhum serviço cadastrado."
      />

      <ServiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        service={editing}
        onSuccess={refresh}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleting(null);
        }}
        onConfirm={handleDelete}
        title="Excluir serviço"
        description={`Tem certeza que deseja excluir ${deleting?.name ?? "este serviço"}?`}
      />
    </div>
  );
}
