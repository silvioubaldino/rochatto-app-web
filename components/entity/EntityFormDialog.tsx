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
  titles: { create: string; edit: string };
  Form: React.ComponentType<EntityFormProps<K>>;
  entity?: EntityRawMap[K];
  size?: ResponsiveDialogSize;
  onSaved?: (entity: EntityRawMap[K]) => void;
}

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
