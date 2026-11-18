---
id: SPEC-009
type: spec
title: Composição da compra — custos adicionais com credor, rateio e custo de entrada (web)
status: done
updated: 2026-11-18
parents: [AYD-008@context]
related: [PDR-002@context, AYD-002@context, AYD-007@context, SPEC-008, SPEC-002, GLO]
---

# Spec: Composição da compra (parte deste repo — web)

> O QUÊ e COMO este repo cumpre o AYD-008 (RF-39). `done` = implementado.

## Objetivo

O dono vê do que é feito o custo de uma Purchase (pedras + **Purchase charges**), a quem deve
cada parte (contas — AYD-007) e o **Landed cost** de cada linha; e vê o **valor em estoque**.

## Abordagem

- **Tipos** (`lib/types.ts`): `PurchaseChargeKind`, `AllocationMethod`, `PurchaseCharge`,
  `PurchaseComposition`, `PurchaseLine`; `PurchaseDetail` += `allocation_method`, `composition`,
  `obligations`, `open`, `lines`, `warnings`; `StockBalance.stock_value`. `PurchaseListItem` torna
  esses campos opcionais.
- **Rótulos** (`lib/formatters.ts`): `PURCHASE_CHARGE_KIND_LABELS` (Frete de compra, Descarga,
  Imposto, Outro), `ALLOCATION_METHOD_LABELS` (Por quantidade (m²), Por valor).
- **Detalhe da compra** (`/compras/[id]`): card de pagamento (custo da compra, pago, a pagar);
  bloco "Composição do custo" (pedras + custos adicionais com credor, "A definir" quando null,
  somar total, seletor de rateio); `PurchaseChargeModal` (RHF + zod; credor padrão = Supplier da
  compra); contas da compra (`OriginObligations`, link `/contas/[id]`); tabela de custo de
  entrada por linha (base, rateado, total, unitário).
- **Erros/avisos:** 422 do rateio e demais erros da API em toast; `warnings: ["OVERSETTLED"]` das
  respostas de POST/PUT de custo adicional vira toast de aviso.
- **Lista** (`/compras`): filtros `open_only` e `overdue` (na URL). **Criação** da compra para
  estoque envia `allocation_method` (default `BY_QUANTITY`).
- **Estoque** (`/estoque`): coluna "Valor em estoque" e total no rodapé.
- Sem UI de pagamento direto na Purchase (removida na SPEC-008).

## Passos / testes

- [x] Tipos, rótulos, schemas (`purchaseChargeSchema`), hooks (filtros, `useStockBalance`).
- [x] Detalhe da compra, modal de custo adicional, seletor de rateio, lista e criação.
- [x] Estoque com valor e total.
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Ambiguidades (a confirmar no AYD-008)

1. `GET /stock/balance` segue array no AYD-002; o AYD-008 não diz onde vem `total_stock_value`.
   O hook aceita array (soma `stock_value`) ou `{ items, total_stock_value }`.
2. `PUT /purchases/{id}` é de substituição? O web reenvia `expected_date`, `notes` e
   `allocation_method` em todo PUT.
3. `DELETE .../charges/{id}` pode devolver `warnings` (OVERSETTLED)? O contrato só cita
   POST/PUT; o DELETE (204) não é lido.
4. Campos de `GET /purchases` (lista) para composição/`open` não estão definidos; o web só
   depende de `total_cost` e `payable`.
