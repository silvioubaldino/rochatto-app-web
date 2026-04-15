"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import type { Produto, Fornecedor, VendedorExterno } from "@/lib/types";
import { useProdutos } from "@/hooks/useProdutos";
import { useFornecedores } from "@/hooks/useFornecedores";
import { useVendedoresExternos } from "@/hooks/useVendedoresExternos";
import { formatMoeda } from "@/lib/formatters";
import { DataTable } from "@/components/tables/DataTable";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ProdutoModal } from "@/components/forms/ProdutoModal";
import { FornecedorModal } from "@/components/forms/FornecedorModal";
import { VendedorExternoModal } from "@/components/forms/VendedorExternoModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";

// --- Produtos Tab ---

function ProdutosTab() {
  const { produtos, isLoading, refresh } = useProdutos();
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
      <div className="flex justify-end">
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
        emptyMessage="Nenhum produto cadastrado."
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

// --- Fornecedores Tab ---

function FornecedoresTab() {
  const { fornecedores, isLoading, refresh } = useFornecedores();
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
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(undefined);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo Fornecedor
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

// --- Vendedores Externos Tab ---

function VendedoresExternosTab() {
  const { vendedoresExternos, isLoading, refresh } = useVendedoresExternos();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VendedorExterno | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<VendedorExterno | null>(null);

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      await api.delete(`/vendedores-externos/${deleting.id}`);
      toast.success("Vendedor externo excluído com sucesso.");
      refresh();
    } catch (err) {
      toast.error(
        err instanceof APIError
          ? err.message
          : "Erro ao excluir vendedor externo.",
      );
    } finally {
      setDeleteOpen(false);
      setDeleting(null);
    }
  }, [deleting, refresh]);

  const columns = [
    { key: "nome" as const, header: "Nome" },
    {
      key: "telefone" as const,
      header: "Telefone",
      render: (row: VendedorExterno) => row.telefone || "—",
    },
    {
      key: "actions",
      header: "Ações",
      width: "100px",
      render: (row: VendedorExterno) => (
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
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(undefined);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo Vendedor Externo
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={vendedoresExternos}
        isLoading={isLoading}
        emptyMessage="Nenhum vendedor externo cadastrado."
      />

      <VendedorExternoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        vendedorExterno={editing}
        onSuccess={refresh}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleting(null);
        }}
        onConfirm={handleDelete}
        title="Excluir vendedor externo"
        description={`Tem certeza que deseja excluir ${deleting?.nome ?? "este vendedor"}?`}
      />
    </div>
  );
}

// --- Main Page ---

export default function CatalogosPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Catálogos</h1>

      <Tabs defaultValue="produtos">
        <TabsList>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="vendedores">Vendedores Externos</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos">
          <ProdutosTab />
        </TabsContent>

        <TabsContent value="fornecedores">
          <FornecedoresTab />
        </TabsContent>

        <TabsContent value="vendedores">
          <VendedoresExternosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
