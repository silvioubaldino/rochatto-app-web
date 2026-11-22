"use client";

import { EntityFormDialog } from "@/components/entity/EntityFormDialog";
import { SupplierForm } from "@/features/suppliers/components/SupplierForm";
import type { Fornecedor } from "@/lib/types";

interface FornecedorModalProps {
  open: boolean;
  onClose: () => void;
  fornecedor?: Fornecedor;
  /** Chamado depois de salvar (a revalidação das listas já é feita pelos eventos de domínio). */
  onSuccess: () => void;
}

/** Invólucro legado: o formulário vive em `@/features/suppliers/components/SupplierForm`. */
export function FornecedorModal({ open, onClose, fornecedor, onSuccess }: FornecedorModalProps) {
  return (
    <EntityFormDialog<"supplier">
      open={open}
      onClose={onClose}
      titles={{ create: "Novo fornecedor / prestador", edit: "Editar fornecedor / prestador" }}
      Form={SupplierForm}
      entity={fornecedor}
      onSaved={() => onSuccess()}
    />
  );
}
