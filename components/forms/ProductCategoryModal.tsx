"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { api, APIError } from "@/lib/api";
import type { ProductCategory } from "@/lib/types";
import {
  productCategorySchema,
  type ProductCategoryFormData,
} from "@/lib/schemas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ProductCategoryModalProps {
  open: boolean;
  onClose: () => void;
  category?: ProductCategory;
  onSuccess: () => void;
}

export function ProductCategoryModal({
  open,
  onClose,
  category,
  onSuccess,
}: ProductCategoryModalProps) {
  const isEdit = !!category;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductCategoryFormData>({
    resolver: zodResolver(productCategorySchema),
  });

  useEffect(() => {
    if (open) reset({ name: category?.name ?? "" });
  }, [open, category, reset]);

  async function onSubmit(data: ProductCategoryFormData) {
    try {
      if (isEdit) {
        await api.put(`/product-categories/${category.id}`, { name: data.name });
        toast.success("Categoria renomeada com sucesso.");
      } else {
        await api.post("/product-categories", { name: data.name });
        toast.success("Categoria criada com sucesso.");
      }
      onSuccess();
      onClose();
    } catch (err) {
      // 409 = nome duplicado (único, ignorando maiúsculas/minúsculas) — erro no campo.
      if (err instanceof APIError && err.status === 409) {
        setError("name", { message: "Já existe uma categoria com esse nome." });
        return;
      }
      const message = err instanceof APIError ? err.message : "Erro ao salvar categoria.";
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Renomear Categoria" : "Nova Categoria"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Nome *</Label>
            <Input
              id="category-name"
              placeholder="ex: Granito, Mármore, Quartzito"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
