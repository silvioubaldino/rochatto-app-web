---
id: SPEC-010
type: spec
title: Composição da venda — preço ao cliente (frete cobrado) e custos da venda com credor (web)
status: done
updated: 2026-11-18
parents: [AYD-009@context]
related: [PDR-002@context, AYD-001@context, AYD-007@context, AYD-008@context, SPEC-008, SPEC-009, GLO]
---

# Spec: Composição da venda (parte deste repo — web)

> O QUÊ e COMO este repo cumpre o AYD-009 (RF-40). `done` = implementado.

## Objetivo

O dono vê do que é feito o **preço ao cliente** (Items + **Sale charges**, ex.: frete cobrado) e
o que a venda custa e a quem (**Sale costs** com credor e conta a pagar), com o **Profit** previsto.

## Abordagem

- **Tipos** (`lib/types.ts`): `SaleChargeKind`, `SaleCostKind`, `SaleCharge`, `SaleCost`, `SalePayee`,
  `SaleComposition`; `Venda` += `composition`, `costs_paid`, `costs_open`, `obligations` e perde
  `frete_valor`/`comissao_valor`; `Quote` += `charges`; `FinanceSalesBlock` perde `freight`/`commission`.
- **Rótulos/schemas**: `SALE_CHARGE_KIND_LABELS`, `SALE_COST_KIND_LABELS` (`lib/formatters.ts`);
  `saleChargeSchema`, `saleCostSchema` e montadores de payload (`lib/schemas.ts`).
- **Orçamento**: `/orcamentos/novo` com bloco "Frete cobrado e outras cobranças" (`ChargesEditor`) enviado
  em `charges` no `POST /quotes` e `/quotes/quick-sale`; total = itens + cobranças. Detalhe com
  `QuoteChargesCard` (edição via `PUT /quotes/{id}` com a lista completa, só Quote aberto).
- **Venda** (`/vendas/[id]`): `SaleCompositionCard` — "Preço ao cliente" (itens + cobranças com
  adicionar/editar/remover via `/vendas/{id}/charges`), "Custos da venda (previsto)" (tipo, credor ou
  "A definir", previsto, link para a conta, adicionar/editar/remover via `/vendas/{id}/costs`),
  pago/em aberto e linha "Lucro previsto". Credor: Supplier (frete/instalador/outro) ou Partner
  (comissão, padrão = parceiro indicador). Remove o card de frete/comissão e `validateFreight`.
- **Erros/avisos**: erros da API em toast; `warnings: ["OVERSETTLED"]` do POST/PUT de custo vira toast.
  Venda cancelada: cobranças somente leitura (409), custos editáveis (AYD-009 §2).
- **Financeiro**: removidas as linhas Frete/Comissão do bloco de vendas.

## Passos / testes

- [x] Tipos, rótulos, schemas.
- [x] Orçamento (novo e detalhe) com cobranças.
- [x] Detalhe da venda com composição, custos e lucro previsto.
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Ambiguidades (a confirmar no AYD-009)

1. O AYD não dá o custo das pedras em `composition`; o web o deriva: `price_total − lucro − costs_total`.
2. `PUT /quotes/{id}` com `charges`: substitui a lista? O web sempre reenvia `notes` e a lista completa.
3. Corpo de `GET /vendas/{id}`: `total_custo`/`lucro` mantêm os nomes legados; semântica de
   `total_custo` (com ou sem custos da venda) não é dita.
4. `GET /finance/summary`: o AYD-009 não diz se `sales.freight`/`commission` saem; o web deixou de usá-los.
5. `DELETE .../costs/{id}` pode devolver `warnings`? Só POST/PUT são lidos.
6. Edição de `sale_item_id` (AYD-010) fora do escopo: preservado no PUT, sem UI.
