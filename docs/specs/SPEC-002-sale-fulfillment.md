---
id: SPEC-002
type: spec
title: Atendimento da Sale — origem do Item, Purchases, Stock e status (web)
status: done
updated: 2026-11-18
parents: [AYD-002@context]
related: [PDR-001@context, ADR-001@context, GLO]
---

# Spec: Atendimento da Sale (parte deste repo — web)

> O QUÊ e COMO este repo cumpre o AYD-002. `done` = implementado (este documento é o
> registro histórico da entrega).

## Objetivo

Papel deste repo no AYD-002 (RF-09, RF-12, RF-13, RF-30, RF-31, RF-32 / RN-03, RN-06,
RN-11–13, RN-15, RN-16, com as simplificações do PDR-001):

- na **Sale**: escolher **origem** (Sob encomenda / De estoque) e **Supplier** por Item;
  mostrar a **Purchase** que atende o Item e travar o que ela trava; **status de entrega**
  manual (A entregar → Entregue) e **cancelamento**; **status de pagamento** calculado;
- **Compras** (novo menu): lista com filtros, fila **"a comprar"** por Supplier → gerar
  Purchase ou anexar a uma aberta, Purchase de **reposição de estoque**, detalhe com
  transições de status e **pagamento ao fornecedor** (um por Purchase);
- **Estoque** (tela substituída): **Balance** por Product, extrato, **ajustes** imutáveis;
- remover o legado: "Nova Venda" / `POST /vendas`, `status_venda` e seus rótulos,
  `pago_fornecedor` / a pagar ao fornecedor por Sale, rotas `/estoque`.

Este repo **consome** os contratos do AYD-002; não redefine enums, payloads nem regras.

## Critérios de aceite

```gherkin
Cenário: Sale só nasce de Quote
  Dado que o dono está em Vendas
  Então não há botão "Nova Venda" nem rota /vendas/nova
  E o atalho "Novo Orçamento / Venda rápida" leva a /orcamentos/novo
  E nenhuma tela chama POST /vendas

Cenário: Lista de Sales com status de entrega e pagamento
  Quando o dono filtra Entrega "A entregar" e Pagamento "Parcial"
  Então a lista vem de GET /vendas?delivery_status=TO_DELIVER&payment_status=PARTIAL
  E cada linha mostra os badges de entrega e de pagamento (rótulos PT-BR, nunca o enum)

Cenário: Definir origem e Supplier de um Item
  Dado um Item made-to-order sem Purchase numa Sale não cancelada
  Quando o dono edita o Item, escolhe "Sob encomenda" e um Fornecedor e salva
  Então é enviado PUT /vendas/{id}/itens/{itemId} com origin:"MADE_TO_ORDER" e fornecedor_id
  E a coluna Compra mostra "A comprar"

Cenário: Item de estoque com custo da última entrada
  Quando o dono troca a origem para "De estoque" sem informar o custo
  Então o PUT vai sem custo_unit (fornecedor_id null)
  E a UI avisa "Custo preenchido com a última entrada do estoque: R$ X" com o custo devolvido

Cenário: Venda sem saldo é avisada, não bloqueada
  Quando a resposta do Item traz warnings:["INSUFFICIENT_STOCK"]
  Então o Item fica gravado, aparece um toast de aviso e o Item mostra "Saldo insuficiente em estoque"

Cenário: Item numa Purchase fica travado
  Dado um Item com purchase_id
  Então ele mostra o link "Compra #xxxx" para /compras/{purchase_id}
  E na edição só o preço de venda é editável, com a explicação e o link para a compra
  E o botão de remover o Item fica desabilitado

Cenário: Marcar como entregue
  Quando o dono clica "Marcar como entregue" e confirma
  Então é enviado PATCH /vendas/{id}/delivery-status {delivery_status:"DELIVERED"}

Cenário: Cancelar Sale com Item em Purchase pedida
  Quando o dono clica "Cancelar venda" e confirma
  E a API responde 409
  Então a mensagem da API aparece no diálogo de confirmação e em toast, e a Sale não muda

Cenário: Sale cancelada é somente leitura
  Dado uma Sale com delivery_status CANCELED
  Então a página mostra o aviso "Venda cancelada — somente leitura"
  E não há ações de editar Items, recebimentos, frete, comissão, prazo/observações nem de status

Cenário: Gerar Purchase a partir da fila
  Dado a aba "A comprar" com Items agrupados por Fornecedor
  Quando o dono marca Items de um Fornecedor e clica "Gerar compra"
  Então é enviado POST /purchases {kind:"MADE_TO_ORDER", supplier_id, sale_item_ids:[…], items:[]}
  E o dono é levado ao detalhe da compra criada

Cenário: Anexar Items a uma Purchase aberta
  Dado que o Fornecedor tem compra sob encomenda Aberta
  Quando o dono escolhe a compra e clica "Adicionar"
  Então é enviado POST /purchases/{id}/sale-items {sale_item_ids:[…]}

Cenário: Items sem Fornecedor
  Dado um grupo da fila com supplier_id null
  Então ele aparece por último, sem seleção, pedindo para definir o fornecedor na venda

Cenário: Compra para estoque
  Quando o dono cria "Compra para estoque" com Fornecedor e linhas (produto, qtd, custo)
  Então é enviado POST /purchases {kind:"STOCK_REPLENISHMENT", supplier_id, items:[…]}

Cenário: Transições de status da Purchase
  Dado uma Purchase Aberta → só "Marcar como pedida"
  Dado uma Purchase Pedida → "Marcar como recebida" e "Voltar para aberta"
  Dado uma Purchase Recebida → nenhuma transição
  E 422 (sem linhas) / 409 aparecem como toast com a mensagem da API

Cenário: Editar linhas só com Purchase aberta
  Dado uma Purchase não Aberta
  Então não há ações de incluir/remover Items de venda nem de editar linhas de reposição, nem "Excluir"

Cenário: Pagamento ao fornecedor
  Quando o dono clica "Registrar pagamento"
  Então o valor vem preenchido com total_cost e a data com hoje
  E é enviado PATCH /purchases/{id}/payment {payment_status:"PAID", paid_amount, paid_at}
  E "Desfazer pagamento" envia {payment_status:"PENDING", paid_amount:null, paid_at:null}

Cenário: Saldo de estoque
  Quando o dono busca "granito" e marca "Só saldo negativo"
  Então a tabela vem de GET /stock/balance?q=granito&only_negative=true
  E saldos negativos aparecem destacados em vermelho
  E clicar numa linha abre o extrato de GET /stock/balance/{productId}

Cenário: Ajuste de estoque
  Quando o dono registra um ajuste com quantidade 0
  Então o erro "A quantidade não pode ser zero" aparece sob o campo e nada é enviado
  E com quantidade -2,5, motivo "Contagem" e data, é enviado POST /stock/adjustments
    {product_id, quantity:-2.5, unit_cost:null, reason:"COUNT", adjusted_at, notes:null}
```

## Contratos consumidos

_Referência ao AYD-002@context — apenas consumo:_

- Item de Sale (legado `/vendas/{id}/itens`): `origin`, `purchase_id` (leitura),
  resposta com `warnings`. `pago_fornecedor` não é mais lido nem enviado.
- Sale (legado `/vendas`): `delivery_status`, `payment_status`, `quote_id`; filtros
  `delivery_status`, `payment_status`; `PATCH /vendas/{id}/delivery-status`. `PUT /vendas/{id}`
  não envia mais `status`. `a_pagar_fornecedor` / `total_pago_fornecedor` não são usados.
  `POST /vendas` não é usado.
- Purchase: `GET|POST /purchases`, `GET|PUT|DELETE /purchases/{id}`,
  `GET /purchases/pending-sale-items`, `POST|DELETE /purchases/{id}/sale-items[/{saleItemId}]`,
  `POST|PUT|DELETE /purchases/{id}/items[/{itemId}]`, `PATCH /purchases/{id}/status`,
  `PATCH /purchases/{id}/payment`; `PurchaseDetail` conforme o AYD.
- Stock: `GET /stock/balance?q=&only_negative=`, `GET /stock/balance/{productId}`,
  `GET|POST /stock/adjustments`. Rotas `/estoque` não são mais usadas.
- Dashboard: o KPI "A Pagar Fornecedores" continua lendo `total_a_pagar_fornecedor` do
  painel (agora Σ `to_pay` das Purchases) e leva a `/compras?payment_status=PENDING`.

## Abordagem (como)

- **Tipos** (`lib/types.ts`): enums `ItemOrigin`, `PurchaseKind`, `PurchaseStatus`,
  `SupplierPaymentStatus`, `SaleDeliveryStatus`, `SalePaymentStatus`,
  `StockAdjustmentReason`; `PurchaseDetail`, `PurchaseListItem`, `PendingSaleItemGroup`,
  `StockBalance`, `StockStatement`, `StockAdjustment`. `StatusVenda`, `EstoqueResumo`,
  `EstoqueEntrada` removidos; `ItemVenda` perde `pago_fornecedor`/`a_pagar_fornecedor` e
  ganha `origin`/`purchase_id`; `Venda` troca `status` por `delivery_status`/`payment_status`.
- **Rótulos/cores** (`lib/formatters.ts`) para todos os enums acima + `formatQuantidade`
  e `todayISO`; os mapas legados `STATUS_LABELS`/`STATUS_COLORS` foram removidos.
  `components/ui/StatusBadge` virou genérico (rótulo + cor); `components/status-badges.tsx`
  tem os badges de entrega, pagamento, compra e pagamento ao fornecedor.
- **Payloads** (`lib/sales.ts`): `PUT /vendas/{id}` e `PUT /vendas/{id}/itens/{itemId}`
  são de substituição completa na API, então a UI sempre envia o registro inteiro
  (`toSaleUpdatePayload`, `toSaleItemPayload`) — nunca um corpo parcial. Item FROM_STOCK
  vai com `fornecedor_id: null`; `custo_unit` é omitido quando o dono deixa o custo
  "automático" (última entrada).
- **Schemas** (`lib/schemas.ts`): `purchaseItemSchema`, `replenishmentPurchaseSchema`,
  `purchaseHeaderSchema`, `supplierPaymentSchema`, `stockAdjustmentSchema` (quantidade ±,
  ≠ 0, vírgula decimal aceita) + montadores de payload (`""` → `null`).
- **Hooks SWR**: `useVendas` (filtros novos), `usePurchases`/`usePurchase`/
  `usePendingSaleItems`, `useStockBalance`/`useStockStatement`/`useStockAdjustments`.
  Mudanças em Purchases revalidam `/purchases*`, `/stock*`, `/vendas*` e `/dashboard*`
  (`isPurchaseRelatedKey`). `hooks/useEstoque.ts` removido.
- **Sale**: `components/sales/SaleItemsCard.tsx` (origem/Supplier por Item, trava por
  Purchase, avisos e custo automático) e `SaleDeliveryActions.tsx` (entregue / voltar /
  cancelar com confirmação; 409 no diálogo). O seletor de status legado e o modal de data
  (A_ENTREGAR_DATA) saíram; o **prazo de entrega** passa a ser editado junto das
  observações.
- **Compras**: `app/(app)/compras` (abas Compras · A comprar) e `compras/[id]`;
  componentes `PendingSaleItemsQueue`, `ReplenishmentPurchaseModal`, `PurchaseItemModal`,
  `PurchaseHeaderModal`, `SupplierPaymentModal`.
- **Estoque**: `app/(app)/estoque` (abas Saldo por produto · Ajustes),
  `StockStatementSheet` (extrato em drawer) e `StockAdjustmentModal`.

## Arquivos / módulos afetados

- `lib/types.ts`, `lib/formatters.ts`, `lib/schemas.ts`, `lib/sales.ts` (novo).
- `hooks/useVendas.ts`, `hooks/usePurchases.ts` (novo), `hooks/useStock.ts` (novo);
  `hooks/useEstoque.ts` (removido).
- `components/ui/StatusBadge.tsx`, `components/status-badges.tsx` (novo),
  `components/sales/*` (novo), `components/purchases/*` (novo), `components/stock/*` (novo);
  `components/forms/EstoqueModal.tsx` (removido).
- `app/(app)/vendas/page.tsx`, `app/(app)/vendas/[id]/page.tsx`,
  `app/(app)/vendas/nova/page.tsx` (removido), `app/(app)/compras/**` (novo),
  `app/(app)/estoque/page.tsx`, `app/(app)/dashboard/page.tsx`, `app/(app)/layout.tsx`
  (menu "Compras").

## Testes (ver docs/conventions.md)

- **Aceite:** um teste por cenário Gherkin acima.
- **Unit:** `stockAdjustmentSchema` (0 ✗; "-2,5" → −2.5 ✓; custo vazio → null; custo
  negativo ✗; motivo vazio ✗), `purchaseItemSchema` (qtd ≤ 0 ✗), `toSaleItemPayload`
  (FROM_STOCK zera Supplier; custo null é omitido), `validateSaleItemDraft` (FROM_STOCK
  sem produto do catálogo ✗), `toSaleUpdatePayload` (nunca envia `status`).
- **Situação:** o repo continua **sem test runner** (ver SPEC-003); verificado por
  `tsc --noEmit`, `eslint` (0 erros) e `next build`.

## Casos de borda & questões ao contrato (sinalizadas, não adaptadas localmente)

Formas que o AYD-002 não fixa — isoladas em `lib/types.ts`/`lib/sales.ts` para reconciliar
com a API:

- **Fila `pending-sale-items`:** assumido `[{supplier_id, supplier_name, items:[{id,
  sale_id, customer_name, produto_id, produto_nome, quantidade, custo_unit, sale_date}]}]`,
  com um grupo `supplier_id: null` para Items sem Supplier (se a API o devolver).
- **Extrato `GET /stock/balance/{productId}`:** assumido `{...linha do Balance,
  movements:[{kind: INFLOW|OUTFLOW|ADJUSTMENT, date, quantity (com sinal), unit_cost,
  reference_id (Purchase/Sale/ajuste), description}]}`.
- **Lista `GET /purchases`:** assumido o mesmo objeto do `PurchaseDetail` (linhas
  opcionais) com `created_at`.
- **`GET /stock/adjustments`:** assumido `product_name` na resposta (fallback: nome do
  catálogo).
- **Item PUT/POST:** `warnings` vem no mesmo objeto do Item; omitir `custo_unit` (e não
  enviar 0) é o sinal de "preencher com a última entrada"; FROM_STOCK enviado com
  `fornecedor_id: null`.
- **`PUT /vendas/{id}`:** a UI envia `vendedor_externo_id`, `data_entrega_prevista`,
  `frete_valor`, `frete_pago`, `comissao_valor`, `comissao_paga`, `observacoes` (sem
  `status`).
- **Status da Purchase do Item:** o Item só traz `purchase_id`; a UI não sabe se a compra
  está aberta, então trava sempre e explica as duas situações.
- **"A Receber" do dashboard:** continua levando a `/vendas?pendente=true` (filtro legado
  que a lista não aplica); sugestão ao AYD: aceitar `payment_status` múltiplo
  (PENDING,PARTIAL).
- **Fora:** Delivery Batch / Driver (RF-33–36), parcelas ao Supplier, reabrir Sale
  cancelada, estorno de Receipts.

## Checklist de entrega

- [x] "Nova Venda" e `POST /vendas` removidos; atalho para Orçamentos / venda rápida
- [x] Lista de Sales: badges e filtros de entrega e pagamento
- [x] Detalhe da Sale: origem/Supplier por Item, link e trava por Purchase, aviso de saldo
      insuficiente, custo automático from stock, entregue / cancelar (409 visível), Sale
      cancelada somente leitura; sem a pagar ao fornecedor por Sale
- [x] Compras: lista com filtros, fila "a comprar" (gerar / anexar), compra para estoque,
      detalhe com status, linhas, pagamento e exclusão só se Aberta
- [x] Estoque: saldo com busca e "só negativos", extrato, novo ajuste, lista de ajustes;
      `/estoque` legado removido
- [x] Dashboard sem dependência de a pagar por Sale
- [ ] Testes automatizados — **não implementado**: sem test runner no repo (ver Testes)
- [x] `docs/changelog.md` e `CLAUDE.md` atualizados
