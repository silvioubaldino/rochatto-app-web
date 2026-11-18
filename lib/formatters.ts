import { format, parseISO } from "date-fns";
import type { StatusVenda, QuoteStatus, PartnerType, LeadSource } from "./types";

export function formatMoeda(valor: number): string {
  const v = typeof valor === "number" ? valor : (Number(valor) || 0);
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatData(isoDate: string): string {
  return format(parseISO(isoDate), "dd/MM/yyyy");
}

export const STATUS_LABELS: Record<StatusVenda, string> = {
  A_ENTREGAR: "A Entregar",
  A_ENTREGAR_DATA: "A Entregar em Data",
  A_RETIRAR: "A Retirar no Depósito",
  ENTREGUE_PARCIAL: "Entregue Parcialmente",
  ENTREGUE: "Entregue",
};

export const STATUS_COLORS: Record<StatusVenda, string> = {
  A_ENTREGAR: "bg-yellow-100 text-yellow-800",
  A_ENTREGAR_DATA: "bg-yellow-100 text-yellow-800",
  A_RETIRAR: "bg-orange-100 text-orange-800",
  ENTREGUE_PARCIAL: "bg-blue-100 text-blue-800",
  ENTREGUE: "bg-green-100 text-green-800",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  OPEN: "Aberto",
  WON: "Ganho",
  LOST: "Perdido",
};

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  WON: "bg-green-100 text-green-800",
  LOST: "bg-red-100 text-red-800",
};

// AYD-003 — Partner type e Lead source (rótulos PT-BR; nunca exibir o código do enum).
export const PARTNER_TYPES: PartnerType[] = ["ARCHITECT", "ENGINEER", "BUILDER", "OTHER"];

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  ARCHITECT: "Arquiteto",
  ENGINEER: "Engenheiro",
  BUILDER: "Construtora",
  OTHER: "Outro",
};

export const LEAD_SOURCES: LeadSource[] = ["REFERRAL", "INSTAGRAM", "PARTNER", "OTHER"];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  REFERRAL: "Indicação",
  INSTAGRAM: "Instagram",
  PARTNER: "Parceiro",
  OTHER: "Outro",
};

/** "Parceiro · Fulano" quando a origem é um Partner; "—" quando não informada. */
export function formatLeadSource(
  leadSource?: LeadSource | null,
  referrerName?: string | null,
): string {
  if (!leadSource) return "—";
  const label = LEAD_SOURCE_LABELS[leadSource] ?? "—";
  return leadSource === "PARTNER" && referrerName ? `${label} · ${referrerName}` : label;
}
