"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EntityCombobox } from "@/components/entity/EntityCombobox";
import type { EntityFormProps } from "@/components/entity/quick-create";
import { FieldShell, MoneyField } from "@/components/patterns/fields";
import { Select } from "@/components/patterns/Select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProductCategories } from "@/hooks/useProductCategories";
import { productSchema, type ProductFormData } from "../schemas";
import { useSaveProduct } from "../mutations";

export function ProductForm({ formId, entity, initialName, onSaved, onPendingChange }: EntityFormProps<"product">) {
  const { categories } = useProductCategories();
  // Categoria excluída (soft-delete) ainda vinculada ao Product: mantém a opção visível.
  const inactive =
    entity?.category_id && !categories.some((c) => c.id === entity.category_id)
      ? { value: entity.category_id, label: `${entity.category_name ?? "Categoria"} (inativa)` }
      : null;
  const categoryOptions = [
    { value: "", label: "Sem categoria" },
    ...(inactive ? [inactive] : []),
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      nome: entity?.nome ?? initialName ?? "",
      descricao: entity?.descricao ?? "",
      preco_referencia: entity?.preco_referencia ?? 0,
      custo_referencia: entity?.custo_referencia ?? 0,
      unidade: entity?.unidade ?? "",
      category_id: entity?.category_id ?? "",
      default_supplier_id: entity?.default_supplier_id ?? "",
    },
  });

  const save = useSaveProduct(entity);
  useEffect(() => onPendingChange?.(save.pending), [save.pending, onPendingChange]);

  async function onSubmit(data: ProductFormData) {
    const saved = await save.mutate(data);
    if (saved) onSaved(saved);
  }

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FieldShell label="Nome" htmlFor="product-name" required error={errors.nome?.message}>
        <Input id="product-name" autoFocus autoComplete="off" {...register("nome")} aria-invalid={!!errors.nome} />
      </FieldShell>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldShell
          label="Categoria"
          htmlFor="product-category"
          hint={categories.length === 0 ? "Nenhuma categoria cadastrada — crie na aba Categorias." : undefined}
        >
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <Select id="product-category" value={field.value ?? ""} onChange={field.onChange} options={categoryOptions} />
            )}
          />
        </FieldShell>
        <FieldShell label="Unidade" htmlFor="product-unit">
          <Input id="product-unit" placeholder="ex: m², peça, kg" autoComplete="off" {...register("unidade")} />
        </FieldShell>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldShell label="Preço de referência" htmlFor="product-price" error={errors.preco_referencia?.message}>
          <Controller
            control={control}
            name="preco_referencia"
            render={({ field }) => <MoneyField id="product-price" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
          />
        </FieldShell>
        <FieldShell label="Custo de referência" htmlFor="product-cost" error={errors.custo_referencia?.message}>
          <Controller
            control={control}
            name="custo_referencia"
            render={({ field }) => <MoneyField id="product-cost" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
          />
        </FieldShell>
      </div>
      <p className="text-xs text-muted-foreground">Estes valores são só referência. O preço real é definido em cada venda.</p>

      <FieldShell label="Fornecedor habitual" htmlFor="product-supplier" hint="Só uma sugestão: já vem preenchido ao fechar a venda.">
        <Controller
          control={control}
          name="default_supplier_id"
          render={({ field }) => (
            <EntityCombobox kind="supplier" id="product-supplier" value={field.value} placeholder="Nenhum" prefer={(f) => f.kind === "STONE"} onChange={(id) => field.onChange(id)} />
          )}
        />
      </FieldShell>

      <FieldShell label="Descrição" htmlFor="product-description">
        <Textarea id="product-description" {...register("descricao")} />
      </FieldShell>
    </form>
  );
}
