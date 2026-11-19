"use client";

import { useState, useCallback, useEffect } from "react";
import { mutate as globalMutate } from "swr";
import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import type {
  Produto,
  Service,
  Fornecedor,
  Partner,
  PartnerType,
  ProductCategory,
  SupplierKind,
} from "@/lib/types";
import { useProdutos } from "@/hooks/useProdutos";
import { useServices } from "@/hooks/useServices";
import { useFornecedores } from "@/hooks/useFornecedores";
import { usePartners } from "@/hooks/usePartners";
import { useProductCategories } from "@/hooks/useProductCategories";
import {
  formatMoeda,
  PARTNER_TYPES,
  PARTNER_TYPE_LABELS,
  SUPPLIER_KINDS,
  SUPPLIER_KIND_LABELS,
} from "@/lib/formatters";
import { DataTable } from "@/components/tables/DataTable";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ProdutoModal } from "@/components/forms/ProdutoModal";
import { ServiceModal } from "@/components/forms/ServiceModal";
import { FornecedorModal } from "@/components/forms/FornecedorModal";
import { PartnerModal } from "@/components/forms/PartnerModal";
import { ProductCategoryModal } from "@/components/forms/ProductCategoryModal";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

// --- Produtos Tab ---

function ProdutosTab() {
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

// --- Fornecedores Tab ---

function FornecedoresTab() {
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

// --- Parceiros (Partner) Tab ---

function PartnersTab() {
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
    { key: "name" as const, header: "Nome" },
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

// --- Categorias de Produto Tab ---

/** Revalida todas as listas de Products (category_name muda ao renomear/excluir). */
function revalidateProdutos() {
  return globalMutate(
    (key) => typeof key === "string" && key.startsWith("/produtos"),
  );
}

function CategoriasTab() {
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

// --- Serviços Tab (AYD-010) ---

function ServicosTab() {
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

// --- Main Page ---

export default function CatalogosPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Catálogos</h1>

      <Tabs defaultValue="produtos">
        <TabsList>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="servicos">Serviços</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores e prestadores</TabsTrigger>
          <TabsTrigger value="parceiros">Parceiros</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos">
          <ProdutosTab />
        </TabsContent>

        <TabsContent value="servicos">
          <ServicosTab />
        </TabsContent>

        <TabsContent value="categorias">
          <CategoriasTab />
        </TabsContent>

        <TabsContent value="fornecedores">
          <FornecedoresTab />
        </TabsContent>

        <TabsContent value="parceiros">
          <PartnersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
