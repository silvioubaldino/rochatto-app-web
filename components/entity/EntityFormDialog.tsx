"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog, type ResponsiveDialogSize } from "@/components/patterns/ResponsiveDialog";
import type { EntityKind } from "./entity-model";
import type { EntityRawMap } from "./entity-queries";
import type { EntityFormProps } from "./quick-create";

export interface EntityFormDialogProps<K extends EntityKind> {
  open: boolean;
  onClose: () => void;
  /** Título para criar e para editar ("Novo cliente" / "Editar cliente"). */
  titles: { create: string; edit: string };
  Form: React.ComponentType<EntityFormProps<K>>;
  /** Registro em edição; sem isto o diálogo cria. */
  entity?: EntityRawMap[K];
  size?: ResponsiveDialogSize;
  /** Chamado com o registro salvo, ANTES de fechar. */
  onSaved?: (entity: EntityRawMap[K]) => void;
}

/**
 * Diálogo de criar/editar um cadastro com o `Form` da entidade (UX-5: um formulário por
 * entidade, o mesmo no QuickCreate e na edição). Os `*Modal` antigos são só invólucros disto.
 */
export function EntityFormDialog<K extends EntityKind>({
  open,
  onClose,
  titles,
  Form,
  entity,
  size = "md",
  onSaved,
}: EntityFormDialogProps<K>) {
  const [pending, setPending] = useState(false);
  const formId = "entity-form";
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={entity ? titles.edit : titles.create}
      size={size}
      dismissible={!pending}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {entity ? "Salvar" : "Criar"}
          </Button>
        </>
      }
    >
      <Form
        formId={formId}
        entity={entity}
        onPendingChange={setPending}
        onSaved={(saved) => {
          onSaved?.(saved);
          onClose();
        }}
      />
    </ResponsiveDialog>
  );
}
