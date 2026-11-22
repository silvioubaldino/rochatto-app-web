"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ComponentType, type ReactNode } from "react";
import type { Obligation } from "@/lib/types";

export interface SettleFlowProps {
  obligations?: readonly Obligation[];
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

export function useSettleFlow(): SettleFlowApi {
  return useContext(SettleFlowContext) ?? NOOP;
}
