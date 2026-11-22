"use client";

import { EntityFormDialog } from "@/components/entity/EntityFormDialog";
import { ProductForm } from "@/features/catalog/components/ProductForm";
import type { Produto } from "@/lib/types";

interface ProdutoModalProps {
  open: boolean;
  onClose: () => void;
  produto?: Produto;
  /** Chamado depois de salvar (a revalidação das listas já é feita pelos eventos de domínio). */
  onSuccess: () => void;
}

/** Invólucro legado: o formulário vive em `@/features/catalog/components/ProductForm`. */
export function ProdutoModal({ open, onClose, produto, onSuccess }: ProdutoModalProps) {
  return (
    <EntityFormDialog<"product">
      open={open}
      onClose={onClose}
      titles={{ create: "Novo produto", edit: "Editar produto" }}
      Form={ProductForm}
      entity={produto}
      onSaved={() => onSuccess()}
    />
  );
}
