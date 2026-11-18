"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useClientes } from "@/hooks/useClientes";
import { api, APIError } from "@/lib/api";
import type { Cliente, LeadSource } from "@/lib/types";
import {
  formatLeadSource,
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  PARTNER_TYPE_LABELS,
} from "@/lib/formatters";
import { usePartners } from "@/hooks/usePartners";
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

  // Filtros de origem (AYD-003): lead_source e, quando Parceiro, qual Partner.
  const [leadSourceFilter, setLeadSourceFilter] = useState<LeadSource | "">("");
  const [referrerFilter, setReferrerFilter] = useState("");
  const { partners } = usePartners();

  const { clientes, isLoading, refresh } = useClientes(debouncedSearch || undefined, {
    lead_source: leadSourceFilter || undefined,
    referrer_id: leadSourceFilter === "PARTNER" ? referrerFilter || undefined : undefined,
  });
  const filtering = !!debouncedSearch || !!leadSourceFilter;

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
      key: "lead_source" as const,
      header: "Origem",
      render: (row: Cliente) => formatLeadSource(row.lead_source, row.referrer_name),
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          aria-label="Filtrar por origem"
          value={leadSourceFilter}
          onChange={(e) => {
            setLeadSourceFilter(e.target.value as LeadSource | "");
            setReferrerFilter("");
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm sm:w-44"
        >
          <option value="">Todas as origens</option>
          {LEAD_SOURCES.map((ls) => (
            <option key={ls} value={ls}>
              {LEAD_SOURCE_LABELS[ls]}
            </option>
          ))}
        </select>
        {leadSourceFilter === "PARTNER" && (
          <select
            aria-label="Filtrar por parceiro"
            value={referrerFilter}
            onChange={(e) => setReferrerFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm sm:w-56"
          >
            <option value="">Todos os parceiros</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {PARTNER_TYPE_LABELS[p.type]}
              </option>
            ))}
          </select>
        )}
      </div>

      <DataTable
        columns={columns}
        data={clientes}
        isLoading={isLoading}
        emptyMessage={filtering ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}
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
