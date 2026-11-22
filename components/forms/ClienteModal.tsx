"use client";

import { EntityFormDialog } from "@/components/entity/EntityFormDialog";
import { CustomerForm } from "@/features/customers/components/CustomerForm";
import type { Cliente } from "@/lib/types";

interface ClienteModalProps {
  open: boolean;
  onClose: () => void;
  cliente?: Cliente;
  /** Chamado depois de salvar (a revalidação das listas já é feita pelos eventos de domínio). */
  onSuccess: () => void;
}

/** Invólucro legado: o formulário vive em `@/features/customers/components/CustomerForm`. */
export function ClienteModal({ open, onClose, cliente, onSuccess }: ClienteModalProps) {
  return (
    <EntityFormDialog<"customer">
      open={open}
      onClose={onClose}
      titles={{ create: "Novo cliente", edit: "Editar cliente" }}
      Form={CustomerForm}
      entity={cliente}
      onSaved={() => onSuccess()}
    />
  );
}
