import type { ItemKind, ItemOrigin, ItemVenda, Venda } from "./types";

// `PUT /vendas/{id}` e `PUT /vendas/{id}/itens/{itemId}` são de substituição completa
// (a API grava todos os campos do corpo), então a UI sempre envia o registro inteiro,
// sobrepondo só o que mudou — nunca um corpo parcial.

export function toSaleUpdatePayload(
  venda: Venda,
  overrides: Partial<{
    data_entrega_prevista: string | null;
    observacoes: string | null;
  }> = {},
) {
  return {
    vendedor_externo_id: venda.vendedor_externo_id || null,
    data_entrega_prevista: venda.data_entrega_prevista
      ? venda.data_entrega_prevista.slice(0, 10)
      : null,
    observacoes: venda.observacoes || null,
    ...overrides,
  };
}

export interface SaleItemDraft {
  produto_id: string | null;
  produto_nome: string;
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
  quantidade: number;
  preco_venda_unit: number;
  custo_unit: number | null;
  origin: ItemOrigin;
  kind: ItemKind;
  service_id: string | null;
}

export function itemToDraft(item: ItemVenda): SaleItemDraft {
  return {
    produto_id: item.produto_id || null,
    produto_nome: item.produto_nome,
    fornecedor_id: item.fornecedor_id || null,
    fornecedor_nome: item.fornecedor_nome || null,
    quantidade: item.quantidade,
    preco_venda_unit: item.preco_venda_unit,
    custo_unit: item.custo_unit,
    origin: item.origin ?? "MADE_TO_ORDER",
    kind: item.kind ?? "PRODUCT",
    service_id: item.service_id ?? null,
  };
}

export function toSaleItemPayload(draft: SaleItemDraft) {
  if (draft.kind === "SERVICE") {
    return {
      kind: "SERVICE" as const,
      service_id: draft.service_id || null,
      produto_id: null,
      produto_nome: draft.produto_nome.trim(),
      fornecedor_id: null,
      quantidade: draft.quantidade,
      preco_venda_unit: draft.preco_venda_unit,
      custo_unit: 0,
    };
  }
  const fromStock = draft.origin === "FROM_STOCK";
  return {
    kind: "PRODUCT" as const,
    service_id: null,
    produto_id: draft.produto_id || null,
    produto_nome: draft.produto_nome.trim(),
    fornecedor_id: fromStock ? null : draft.fornecedor_id || null,
    fornecedor_nome: fromStock ? null : draft.fornecedor_nome || null,
    quantidade: draft.quantidade,
    preco_venda_unit: draft.preco_venda_unit,
    origin: draft.origin,
    ...(draft.custo_unit === null ? {} : { custo_unit: draft.custo_unit }),
  };
}

export function validateSaleItemDraft(draft: SaleItemDraft): string | null {
  if (!draft.produto_nome.trim())
    return draft.kind === "SERVICE" ? "Informe o serviço." : "Informe o produto.";
  if (!(draft.quantidade > 0)) return "Quantidade deve ser maior que zero.";
  if (draft.preco_venda_unit < 0) return "Preço não pode ser negativo.";
  if (draft.kind === "SERVICE") return null;
  if (draft.custo_unit !== null && draft.custo_unit < 0) return "Custo não pode ser negativo.";
  if (draft.origin === "FROM_STOCK" && !draft.produto_id)
    return "Item de estoque precisa de um produto do catálogo (o saldo é por produto).";
  return null;
}
