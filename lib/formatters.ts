import { format, parseISO } from "date-fns";
import type { StatusVenda } from "./types";

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
