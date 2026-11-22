"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import type { Partner, PartnerType } from "@/lib/types";
import { usePartners } from "@/hooks/usePartners";
import { PARTNER_TYPES, PARTNER_TYPE_LABELS } from "@/lib/formatters";
import { DataTable } from "@/components/tables/DataTable";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { PartnerModal } from "@/components/forms/PartnerModal";
import { EntityLink } from "@/components/entity/EntityLink";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

export function PartnersTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<PartnerType | "">("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { partners, isLoading, refresh } = usePartners({
    q: debouncedSearch || undefined,
    type: typeFilter || undefined,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<Partner | null>(null);

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      await api.delete(`/partners/${deleting.id}`);
      toast.success("Parceiro excluído com sucesso.");
      refresh();
    } catch (err) {
      toast.error(err instanceof APIError ? err.message : "Erro ao excluir parceiro.");
    } finally {
      setDeleteOpen(false);
      setDeleting(null);
    }
  }, [deleting, refresh]);

  const columns = [
    {
      key: "name" as const,
      header: "Nome",
      render: (row: Partner) => <EntityLink type="partner" id={row.id}>{row.name}</EntityLink>,
    },
    {
      key: "type" as const,
      header: "Tipo",
      render: (row: Partner) => PARTNER_TYPE_LABELS[row.type] ?? "—",
    },
    {
      key: "phone" as const,
      header: "Telefone",
      render: (row: Partner) => row.phone || "—",
    },
    {
      key: "actions",
      header: "Ações",
      width: "100px",
      render: (row: Partner) => (
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

  const filtering = !!debouncedSearch || !!typeFilter;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar parceiro por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          aria-label="Filtrar por tipo"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as PartnerType | "")}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm sm:w-48"
        >
          <option value="">Todos os tipos</option>
          {PARTNER_TYPES.map((t) => (
            <option key={t} value={t}>
              {PARTNER_TYPE_LABELS[t]}
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
          Novo Parceiro
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={partners}
        isLoading={isLoading}
        emptyMessage={
          filtering ? "Nenhum parceiro encontrado." : "Nenhum parceiro cadastrado."
        }
      />

      <PartnerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        partner={editing}
        onSuccess={refresh}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleting(null);
        }}
        onConfirm={handleDelete}
        title="Excluir parceiro"
        description={`Tem certeza que deseja excluir ${deleting?.name ?? "este parceiro"}? Clientes, orçamentos e vendas já vinculados mantêm o histórico.`}
      />
    </div>
  );
}
