"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog, type ResponsiveDialogSize } from "@/components/patterns/ResponsiveDialog";
import type { EntityKind } from "./entity-model";
import type { EntityRawMap } from "./entity-queries";

/**
 * QuickCreate: criar um cadastro SEM sair da tela (UX-3). O formulário de cada entidade
 * se REGISTRA aqui (`features/register.ts`) e o `EntityCombobox` / menu "Novo" o abrem por
 * `useQuickCreate().open(kind, …)`. O registro criado volta por `onCreated`.
 */

/** Contrato de TODO formulário de cadastro (criar e editar), usado dentro de um diálogo. */
export interface EntityFormProps<K extends EntityKind> {
  /** `id` do <form>: o botão de enviar do diálogo (rodapé fixo) o referencia por `form=`. */
  formId: string;
  /** Editando um registro existente (sem isto = criando). */
  entity?: EntityRawMap[K];
  /** Texto digitado no combobox, para pré-preencher o nome. */
  initialName?: string;
  /** Chamado com o registro devolvido pela api (criado ou atualizado). */
  onSaved: (entity: EntityRawMap[K]) => void;
  /** Informa ao diálogo que está salvando (desabilita o botão, mostra o indicador). */
  onPendingChange?: (pending: boolean) => void;
}

export interface QuickCreateDefinition<K extends EntityKind> {
  /** Título do diálogo: "Novo cliente". */
  title: string;
  Form: ComponentType<EntityFormProps<K>>;
  size?: ResponsiveDialogSize;
}

// Registro de módulo (preenchido por `features/register.ts`; testes registram os seus).
const registry = new Map<EntityKind, QuickCreateDefinition<EntityKind>>();

export function registerQuickCreate<K extends EntityKind>(kind: K, definition: QuickCreateDefinition<K>): void {
  registry.set(kind, definition as unknown as QuickCreateDefinition<EntityKind>);
}

export function hasQuickCreate(kind: EntityKind): boolean {
  return registry.has(kind);
}

/** Só para testes. */
export function clearQuickCreateRegistry(): void {
  registry.clear();
}

export interface QuickCreateOptions<K extends EntityKind> {
  initialName?: string;
  onCreated?: (entity: EntityRawMap[K]) => void;
}

interface QuickCreateApi {
  open: <K extends EntityKind>(kind: K, options?: QuickCreateOptions<K>) => void;
}

const QuickCreateContext = createContext<QuickCreateApi | null>(null);

interface OpenState {
  kind: EntityKind;
  initialName: string;
  onCreated?: (entity: EntityRawMap[EntityKind]) => void;
  /** Identifica a abertura (chave do React, id do <form>). */
  nonce: number;
}

let nonceCounter = 0;

/**
 * Hospeda os diálogos de criação rápida (uma vez, no AppShell). É uma PILHA: criar um
 * parceiro de dentro do cadastro de cliente empilha outro diálogo por cima, sem perder o
 * que já foi digitado no de baixo.
 */
export function QuickCreateProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<OpenState[]>([]);

  const open = useCallback<QuickCreateApi["open"]>((kind, options) => {
    if (!registry.has(kind)) return;
    nonceCounter += 1;
    setStack((s) => [
      ...s,
      {
        kind,
        initialName: options?.initialName ?? "",
        onCreated: options?.onCreated as OpenState["onCreated"],
        nonce: nonceCounter,
      },
    ]);
  }, []);

  const api = useMemo(() => ({ open }), [open]);
  const pop = useCallback((nonce: number) => setStack((s) => s.filter((e) => e.nonce !== nonce)), []);

  return (
    <QuickCreateContext.Provider value={api}>
      {children}
      {stack.map((entry) => (
        <QuickCreateDialog key={entry.nonce} entry={entry} onClose={() => pop(entry.nonce)} />
      ))}
    </QuickCreateContext.Provider>
  );
}

function QuickCreateDialog({ entry, onClose }: { entry: OpenState; onClose: () => void }) {
  const [pending, setPending] = useState(false);
  const definition = registry.get(entry.kind);
  if (!definition) return null;
  const formId = `quick-create-${entry.nonce}`;
  return (
    <ResponsiveDialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={definition.title}
      size={definition.size ?? "md"}
      dismissible={!pending}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Criar
          </Button>
        </>
      }
    >
      <definition.Form
        formId={formId}
        initialName={entry.initialName}
        onPendingChange={setPending}
        onSaved={(created) => {
          entry.onCreated?.(created);
          onClose();
        }}
      />
    </ResponsiveDialog>
  );
}

const NOOP_API: QuickCreateApi = { open: () => {} };

/** `const quickCreate = useQuickCreate(); quickCreate.open("customer", { initialName, onCreated })`. */
export function useQuickCreate(): QuickCreateApi {
  return useContext(QuickCreateContext) ?? NOOP_API;
}
