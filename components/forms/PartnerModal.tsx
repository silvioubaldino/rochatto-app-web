"use client";

import { EntityFormDialog } from "@/components/entity/EntityFormDialog";
import { PartnerForm } from "@/features/partners/components/PartnerForm";
import type { Partner } from "@/lib/types";

interface PartnerModalProps {
  open: boolean;
  onClose: () => void;
  partner?: Partner;
  /** Chamado depois de salvar (a revalidação das listas já é feita pelos eventos de domínio). */
  onSuccess: () => void;
}

/** Invólucro legado: o formulário vive em `@/features/partners/components/PartnerForm`. */
export function PartnerModal({ open, onClose, partner, onSuccess }: PartnerModalProps) {
  return (
    <EntityFormDialog<"partner">
      open={open}
      onClose={onClose}
      titles={{ create: "Novo parceiro", edit: "Editar parceiro" }}
      Form={PartnerForm}
      entity={partner}
      onSaved={() => onSuccess()}
    />
  );
}
