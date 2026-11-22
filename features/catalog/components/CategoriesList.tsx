"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CatalogList } from "@/components/entity/catalog-list";
import { FieldShell } from "@/components/patterns/fields";
import { ResponsiveDialog } from "@/components/patterns/ResponsiveDialog";
import { useProductCategories } from "@/hooks/useProductCategories";
import { productCategorySchema, type ProductCategoryFormData } from "@/lib/schemas";
import { errorMessage, isApiError } from "@/lib/errors";
import type { ProductCategory } from "@/lib/types";
import { useDeleteCategory, useSaveCategory } from "../mutations";

const FORM_ID = "category-form";

function CategoryDialog({ entity, onClose }: { entity?: ProductCategory; onClose: () => void }) {
  const save = useSaveCategory(entity);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProductCategoryFormData>({ resolver: zodResolver(productCategorySchema), defaultValues: { name: entity?.name ?? "" } });

  async function onSubmit(data: ProductCategoryFormData) {
    try {
      await save.mutateAsync(data.name);
      onClose();
    } catch (err) {
      // 409 = nome duplicado (único, sem diferenciar maiúsculas) — erro no campo.
      setError("name", { message: isApiError(err) && err.status === 409 ? "Já existe uma categoria com esse nome." : errorMessage(err, "Erro ao salvar a categoria.") });
    }
  }

  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={entity ? "Renomear categoria" : "Nova categoria"}
      size="sm"
      dismissible={!save.pending}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={save.pending}>Cancelar</Button>
          <Button type="submit" form={FORM_ID} disabled={save.pending}>
            {save.pending && <Loader2 className="animate-spin" aria-hidden />}
            {entity ? "Salvar" : "Criar"}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)}>
        <FieldShell label="Nome" htmlFor="category-name" required error={errors.name?.message}>
          <Input id="category-name" autoFocus autoComplete="off" placeholder="Granito, mármore, quartzito…" aria-invalid={!!errors.name} {...register("name")} />
        </FieldShell>
      </form>
    </ResponsiveDialog>
  );
}

/** Categorias de produto (T16): dentro de Produtos, cadastráveis pelo dono. */
export function CategoriesList() {
  const { categories, isLoading, error, refresh } = useProductCategories();
  const remove = useDeleteCategory();
  return (
    <CatalogList<ProductCategory>
      caption="Categorias de produto"
      rows={categories}
      rowKey={(c) => c.id}
      nameOf={(c) => c.name}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refresh()}
      empty={{ title: "Nenhuma categoria cadastrada." }}
      createLabel="Nova categoria"
      columns={[{ id: "name", header: "Nome", phone: "title", sortValue: (c) => c.name, cell: (c) => c.name }]}
      renderForm={({ entity, onClose }) => <CategoryDialog entity={entity} onClose={onClose} />}
      onDelete={(c) => remove.mutateAsync(c.id)}
      deleteTitle="Excluir categoria"
      deleteDescription={(c) => `Excluir a categoria ${c.name}? Os produtos dela ficam sem categoria.`}
    />
  );
}
