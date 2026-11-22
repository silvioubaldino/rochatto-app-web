"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ComponentType, type ReactNode } from "react";
import type { Obligation } from "@/lib/types";

/**
 * SettleFlow (UX-P09): Pagar/Receber 1..N contas num fluxo só, aberto de qualquer tela
 * (Hoje, venda, compra, Fornecedor 360, A receber/A pagar). A implementação (formulário, mutações,
 * "Desfazer") mora em `features/finance` e se REGISTRA aqui, como o QuickCreate — `components/entity`
 * não conhece features (dependências só descem — AYD-011 §9.2).
 */

export interface SettleFlowProps {
  /** Contas já carregadas (todas da mesma direção)… */
  obligations?: readonly Obligation[];
  /** …ou só os ids: o fluxo as carrega (ex.: a partir de uma pendência do Hoje). */
  obligationIds?: readonly string[];
  onClose: () => void;
}

let Implementation: ComponentType<SettleFlowProps> | null = null;

export function registerSettleFlow(component: ComponentType<SettleFlowProps>): void {
  Implementation = component;
}

export interface SettleFlowRequest {
  obligations?: readonly Obligation[];
  obligationIds?: readonly string[];
  /** Chamado ao fechar o fluxo (concluído ou não). */
  onClosed?: () => void;
}

interface SettleFlowApi {
  open: (request: SettleFlowRequest) => void;
}

const SettleFlowContext = createContext<SettleFlowApi | null>(null);

interface OpenState extends SettleFlowRequest {
  nonce: number;
}

let nonceCounter = 0;

/** Hospeda o diálogo único do SettleFlow (uma vez, no AppShell). */
export function SettleFlowProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<OpenState | null>(null);
  const open = useCallback<SettleFlowApi["open"]>((request) => {
    if (!Implementation) return;
    nonceCounter += 1;
    setCurrent({ ...request, nonce: nonceCounter });
  }, []);
  const api = useMemo(() => ({ open }), [open]);
  const Flow = Implementation;
  return (
    <SettleFlowContext.Provider value={api}>
      {children}
      {current && Flow && (
        <Flow
          key={current.nonce}
          obligations={current.obligations}
          obligationIds={current.obligationIds}
          onClose={() => {
            current.onClosed?.();
            setCurrent(null);
          }}
        />
      )}
    </SettleFlowContext.Provider>
  );
}

const NOOP: SettleFlowApi = { open: () => {} };

/** `const settle = useSettleFlow(); settle.open({ obligations: [conta] })`. */
export function useSettleFlow(): SettleFlowApi {
  return useContext(SettleFlowContext) ?? NOOP;
}
