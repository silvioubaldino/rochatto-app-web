"use client";

import { EntityFormDialog } from "@/components/entity/EntityFormDialog";
import { ServiceForm } from "@/features/catalog/components/ServiceForm";
import type { Service } from "@/lib/types";

interface ServiceModalProps {
  open: boolean;
  onClose: () => void;
  service?: Service;
  /** Chamado depois de salvar (a revalidação das listas já é feita pelos eventos de domínio). */
  onSuccess: () => void;
}

/** Invólucro legado: o formulário vive em `@/features/catalog/components/ServiceForm`. */
export function ServiceModal({ open, onClose, service, onSuccess }: ServiceModalProps) {
  return (
    <EntityFormDialog<"service">
      open={open}
      onClose={onClose}
      titles={{ create: "Novo serviço", edit: "Editar serviço" }}
      Form={ServiceForm}
      entity={service}
      onSaved={() => onSuccess()}
    />
  );
}
