"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionsMenu } from "@/components/patterns/ActionsMenu";
import { ConfirmDialog } from "@/components/patterns/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/patterns/DataTable";
import type { StateAction } from "@/components/patterns/states";

export interface CatalogListProps<T> {
  caption: string;
  rows: readonly T[];
  rowKey: (row: T) => string;
  columns: readonly DataTableColumn<T>[];
  /** Nome humano da linha, para os menus e a confirmação ("Rock face"). */
  nameOf: (row: T) => string;
  rowHref?: (row: T) => string;
  isLoading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty: { title: string; description?: string; action?: StateAction };
  /** "Novo produto". */
  createLabel: string;
  /** Busca e filtros (FilterBar), acima da lista. */
  toolbar?: ReactNode;
  /** O diálogo de cadastro (criar: `entity` ausente; editar: a linha). */
  renderForm: (args: { entity?: T; onClose: () => void }) => ReactNode;
  /** Exclui a linha; o erro (409) sobe para o ConfirmDialog. */
  onDelete: (row: T) => Promise<unknown>;
  deleteTitle: string;
  deleteDescription: (row: T) => string;
}

/**
 * Lista de um cadastro (Produtos, Serviços, Fornecedores, Parceiros, Categorias): `DataTable`
 * com "Novo", menu Editar/Excluir por linha (44 px no celular) e confirmação do excluir.
 */
export function CatalogList<T>({
  caption,
  rows,
  rowKey,
  columns,
  nameOf,
  rowHref,
  isLoading,
  error,
  onRetry,
  empty,
  createLabel,
  toolbar,
  renderForm,
  onDelete,
  deleteTitle,
  deleteDescription,
}: CatalogListProps<T>) {
  const [form, setForm] = useState<{ entity?: T } | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);

  const actions: DataTableColumn<T> = {
    id: "actions",
    header: "Ações",
    phone: "meta",
    align: "right",
    width: "4rem",
    cell: (row) => (
      <span className="relative z-10 inline-flex">
        <ActionsMenu
          label={`Ações de ${nameOf(row)}`}
          items={[
            { id: "edit", label: "Editar", onSelect: () => setForm({ entity: row }) },
            { id: "delete", label: "Excluir", danger: true, onSelect: () => setDeleting(row) },
          ]}
        />
      </span>
    ),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 basis-64">{toolbar}</div>
        <Button type="button" onClick={() => setForm({})}>
          <Plus aria-hidden />
          {createLabel}
        </Button>
      </div>
      <DataTable
        caption={caption}
        columns={[...columns, actions]}
        rows={rows}
        rowKey={rowKey}
        rowHref={rowHref}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        empty={{ ...empty, action: empty.action ?? { label: createLabel, onClick: () => setForm({}) } }}
      />
      {form && renderForm({ entity: form.entity, onClose: () => setForm(null) })}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        tone="danger"
        title={deleteTitle}
        description={deleting ? deleteDescription(deleting) : undefined}
        confirmLabel="Excluir"
        onConfirm={() => onDelete(deleting as T)}
      />
    </div>
  );
}
