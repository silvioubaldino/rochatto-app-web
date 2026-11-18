---
id: SPEC-008
type: spec
title: Contas e movimentações — contas a pagar/receber, parcelas, quitação e Movimentações (web)
status: done
updated: 2026-11-18
parents: [AYD-007@context]
related: [PDR-002@context, AYD-004@context, AYD-008@context, AYD-009@context, ADR-001@context, SPEC-004, SPEC-003, GLO]
---

# Spec: Contas e movimentações (parte deste repo — web)

> O QUÊ e COMO este repo cumpre o AYD-007. `approved` = contrato local congelado;
> `done` = implementado.

## Objetivo

Papel do web no AYD-007 (RF-38 / RN-17, PDR-002): telas para o dono ver e quitar o que
deve e o que tem a receber, e para registrar o dinheiro executado.

- **Contas a pagar / a receber** (`/contas`): lista de **Obligations** com filtros e totais.
- **Detalhe da conta** (`/contas/[id]`): componentes, **Installments** com cobertura,
  **Settlements**, ação **Pagar / Receber**, edição de `due_date`/`notes`, definir e gerar parcelas.
- **Pagar várias contas** (um Pix, N alocações), com aviso `MIXED_COUNTERPARTIES`.
- **Movimentações** (`/movimentacoes`): lista, criar despesa / `OTHER_INCOME`, corrigir, anular.
- **Fornecedores e prestadores**: campo `kind` no cadastro e filtro por tipo.
- **Financeiro**: despesas, resultado do período e saldos por tipo de credor.
- **Substituir** a UI de Receipts da Sale pela conta RECEIVABLE e a de pagamento da Purchase
  pelas contas PAYABLE.

O web **consome** o contrato do AYD-007; não redefine enums, payloads nem regras. Valor,
quitado, em aberto, status e cobertura são **calculados pela API** — nunca recalculados
no cliente para decisão (apenas exibição de somas de formulário). A edição de componentes e
credores por componente pertence ao AYD-008/009 e **não** está nesta SPEC.

## Critérios de aceite

```gherkin
Cenário: Lista de contas a pagar
  Quando o dono abre /contas na aba "A pagar"
  Então vem de GET /obligations?direction=PAYABLE&status=OPEN,PARTIAL
  E cada linha mostra credor (ou "A definir"), origem (label), valor, em aberto, vencimento e selo "Vencida" se overdue
  E o rodapé mostra totals {amount, settled, open}

Cenário: Lista de contas a receber
  Quando o dono troca para a aba "A receber"
  Então vem de GET /obligations?direction=RECEIVABLE com os mesmos filtros e o devedor é o Customer

Cenário: Filtros e URL
  Quando o dono filtra por status, credor, vencidas ou "vence até"
  Então os parâmetros (status, counterparty_type/id, overdue, due_to) vão na URL e na chamada
  E a paginação usa limit/offset e has_more

Cenário: Detalhe da conta
  Quando o dono abre uma conta
  Então vê componentes (label/valor), parcelas com status (Aberta/Parcial/Coberta) e atraso,
      quitações com a movimentação e o resumo amount/settled/open/status
  E a origem leva à Sale ou Purchase

Cenário: Editar prazo e observações
  Quando o dono altera due_date ou notes
  Então é enviado PATCH /obligations/{id} apenas com os campos alterados (null limpa o prazo)

Cenário: Definir parcelas
  Quando o dono edita o plano manualmente
  Então é enviado PUT /obligations/{id}/installments com todas as parcelas
  E o formulário bloqueia envio se Σ parcelas > amount da conta

Cenário: Gerar parcelas
  Quando o dono informa count (2 a 24), first_due_date e, opcionalmente, interval_months e amount
  Então é enviado POST /obligations/{id}/installments/generate
  E as parcelas retornadas substituem as exibidas

Cenário: Pagar uma conta
  Dado uma conta PAYABLE com open > 0
  Quando o dono clica em "Pagar", informa valor (default open), data e forma e confirma
  Então é enviado POST /obligations/{id}/settle {amount, movement:{occurred_on, payment_method}} (201, com warnings opcionais)
  E a conta, as parcelas cobertas e a lista são revalidados

Cenário: Receber de um cliente
  Dado uma conta RECEIVABLE com open > 0
  Então o botão é "Receber" e o fluxo é o mesmo; forma de pagamento obrigatória

Cenário: Valor acima do devido
  Quando a API responde 409 "valor acima do devido"
  Então a mensagem aparece como erro do formulário e nada é fechado

Cenário: Conta de Sale cancelada
  Dado uma conta RECEIVABLE de Sale cancelada
  Então a ação Receber fica oculta e um 409 da API ("venda cancelada: recebimentos bloqueados") aparece como toast
  E as quitações existentes continuam visíveis

Cenário: Pagar várias contas
  Quando o dono seleciona contas da mesma direção na lista e clica em "Pagar várias contas"
  Então o diálogo mostra cada conta com amount editável (default open) e o total
  E é enviado POST /settlements {movement:{occurred_on, payment_method}, allocations:[{obligation_id, amount}]}
  E contas de direções diferentes não podem ser selecionadas juntas

Cenário: Aviso de credores diferentes
  Dado contas de credores diferentes selecionadas
  Então o diálogo avisa antes de confirmar que um Pix tem um destinatário, sem bloquear
  Quando a resposta (201) traz warnings: ["MIXED_COUNTERPARTIES"] ou ["OVERSETTLED"]
  Então a operação já está gravada e cada aviso aparece como toast de atenção

Cenário: Desfazer quitação
  Quando o dono remove uma quitação no detalhe da conta (após confirmação)
  Então é enviado DELETE /settlements/{id} e a movimentação permanece na lista

Cenário: Lista de movimentações
  Quando o dono abre /movimentacoes
  Então vem de GET /financial-movements com from/to (default mês corrente), category, direction, unallocated_only
  E mostra totals {inflow, outflow, net}, valor com sinal, categoria, forma, contraparte/descrição e "Sem alocação" quando unallocated > 0

Cenário: Lançar despesa
  Quando o dono cria uma despesa com categoria de despesa, valor, data e forma
  Então é enviado POST /financial-movements com amount negativo
  E categorias de entrada/conta (SALE_RECEIPT, PURCHASE_PAYMENT, FREIGHT, COMMISSION) não são oferecidas

Cenário: Lançar receita avulsa
  Quando o dono cria uma entrada com categoria OTHER_INCOME
  Então é enviado POST /financial-movements com amount positivo

Cenário: Corrigir movimentação
  Quando o dono edita uma movimentação
  Então é enviado PUT /financial-movements/{id} com o mesmo corpo do POST (occurred_on, amount com sinal, category, payment_method, counterparty_name, description) e a linha mostra "Corrigida"
  E um 409 (Σ quitações > |amount| ou inversão de sinal) aparece como erro do formulário

Cenário: Anular movimentação
  Quando o dono confirma a anulação, avisado de que as quitações serão desfeitas
  Então é enviado DELETE /financial-movements/{id} e as listas de contas e movimentações são revalidadas

Cenário: Tipo do Supplier
  Quando o dono cria ou edita um fornecedor
  Então escolhe o tipo (Pedra, Transporte, Mão de obra, Órgão de imposto, Outro; default Pedra) enviado em kind
  E a lista de /catalogos filtra por GET /fornecedores?kind= e mostra o tipo

Cenário: Painel Financeiro com despesas e resultado
  Quando o dono abre /financeiro
  Então, além dos blocos existentes, vê "Despesas" (total e por categoria),
      "Resultado do período" (sales_profit − expenses = net_result) e
      "Saldos em aberto" (receivable, payable e payable por tipo de credor)
  E o cartão de a receber leva a /contas?direction=RECEIVABLE e o de a pagar a /contas?direction=PAYABLE

Cenário: Sale sem Receipts
  Quando o dono abre o detalhe de uma Sale
  Então não há mais modal/lista de Receipts nem confirmar; a seção "Recebimentos" mostra a conta RECEIVABLE
      (valor, recebido, em aberto, parcelas, quitações) com ações Receber e Parcelar,
      e as contas PAYABLE da venda (frete, comissão) com link para /contas/[id]

Cenário: Purchase sem pagamento único
  Quando o dono abre o detalhe de uma Purchase
  Então o formulário de pagamento (PATCH /purchases/{id}/payment) some e são listadas as contas PAYABLE
      da compra com Pagar e link ao detalhe; "A pagar"/"Pago" vêm de payable/paid da Purchase

Cenário: Alertas
  Então alertas de conta a pagar (conta_pagar_vencendo / conta_pagar_vencida) usam o rótulo
      "Conta a pagar vencendo/vencida"
  E todo alerta traz obligation_id (e installment_id quando vem de parcela) e leva a /contas/{obligation_id}

Cenário: Componentes da conta (fontes transitórias, AYD-007 §7a)
  Quando o detalhe lista os componentes
  Então os tipos SALE_ITEMS, LEGACY_FREIGHT, LEGACY_COMMISSION e PURCHASE_ITEMS têm rótulo próprio
      ("Itens da venda", "Frete da venda", "Comissão", "Pedras da compra"); tipo desconhecido usa o label da API
  E conta sem credor aparece como "A definir"; a edição de componentes/credor é do AYD-008/009

Cenário: Sale sem Freight/Commission pagos
  Então a Sale deixa de enviar/mostrar frete_pago e comissao_paga e os filtros freight_pending/commission_pending saem
  E o pagamento de frete e comissão é feito nas contas PAYABLE da venda
```

## Contratos consumidos

_Referência ao AYD-007@context — apenas consumo:_

- Enums: `SupplierKind`, `ObligationDirection`, `ObligationStatus`, `InstallmentStatus`,
  `MovementCategory`; `PaymentMethod` (AYD-004).
- `GET /obligations`, `GET|PATCH /obligations/{id}`, `PUT /obligations/{id}/installments`,
  `POST /obligations/{id}/installments/generate`, `POST /obligations/{id}/settle`.
- `POST /settlements`, `DELETE /settlements/{id}`.
- `GET|POST /financial-movements`, `PUT|DELETE /financial-movements/{id}`.
- `Supplier.kind` em `/fornecedores` (req/res, filtro `?kind=`).
- `GET /finance/summary` com `cash`, `expenses`, `result`, `balances` (§6).
- Sale/Purchase: saldos vêm da conta (Sale: `receivable`, `payment_status`; Purchase: `payable`, `paid`).
- Removidos (não chamar mais): `/vendas/{id}/pagamentos[...]`, `PATCH /purchases/{id}/payment`, e os campos
  `frete_pago`/`comissao_paga` da Sale e `payment_status`/`paid_amount`/`paid_at`/`to_pay` da Purchase.
- Códigos: 400 validação, 404, 409 conflito (mensagem exibida); `POST /settlements` e `/obligations/{id}/settle`
  respondem **201** `{movement, obligations, warnings?}` com `warnings[]` (`MIXED_COUNTERPARTIES`, `OVERSETTLED`).
- Componentes (`components[].type`): `SALE_ITEMS`, `LEGACY_FREIGHT`, `LEGACY_COMMISSION`, `PURCHASE_ITEMS` (§7a).
- Alertas: `obligation_id` (+ `installment_id`); tipos `conta_pagar_vencendo`/`conta_pagar_vencida`.
- `PUT /financial-movements/{id}`: corpo = corpo do `POST`.
- **Assunções** (o AYD não fixa a forma): `by_category[]` do `/finance/summary` = `{category, amount}`;
  resposta de `/obligations/{id}/settle` = a de `/settlements`; movimentação resumida da quitação traz
  `id, occurred_on, amount, category, payment_method`; o alerta de conta a pagar usa `cliente_nome` para o credor.

## Abordagem (como)

- **Tipos** (`lib/types.ts`): `SupplierKind`, `ObligationDirection`, `ObligationStatus`,
  `InstallmentStatus`, `MovementCategory`, `Obligation`, `ObligationComponent`, `Installment`,
  `ObligationSettlement`, `FinancialMovement`, `Paged<T>` com `totals`; `FinanceSummary` ampliado.
  `Supplier.kind`. Espelham o AYD exatamente; `Purchase.payable`/`paid` e `NotificacaoTipo` ampliado.
- **Rótulos** (`lib/formatters.ts`): `SUPPLIER_KIND_LABELS`, `OBLIGATION_STATUS_LABELS`,
  `INSTALLMENT_STATUS_LABELS`, `MOVEMENT_CATEGORY_LABELS` (+ listas `EXPENSE_CATEGORIES`,
  `INCOME_CATEGORIES`), `DIRECTION_LABELS`; badges em `components/status-badges.tsx`. Nunca exibir
  o código do enum.
- **Schemas** (`lib/schemas.ts`): `settleSchema`, `bulkSettleSchema`, `installmentsSchema`,
  `generateInstallmentsSchema`, `movementSchema`, `obligationPatchSchema` + montadores de payload
  puros; `""` vira ausente. Sinal da movimentação derivado da categoria (despesa = negativo).
- **Hooks:** `useObligations(filters)`, `useObligation(id)`, `useFinancialMovements(filters)`
  (SWR); mutations via `lib/api.ts` seguidas de `mutate()` de obligations, movements, finance e
  da Sale/Purchase de origem.
- **Lógica pura** (`lib/obligations.ts`): parse/serialização de filtros da URL, validação de
  Σ parcelas ≤ amount, seleção de contas (mesma direção; detecção de credores distintos),
  distribuição default das alocações.
- **Páginas:** `app/(app)/contas/page.tsx` (abas, filtros, seleção múltipla, totais),
  `contas/[id]/page.tsx`, `movimentacoes/page.tsx`; componentes em `components/obligations/`
  (`ObligationTable`, `InstallmentsEditor`, `GenerateInstallmentsDialog`, `SettleDialog`,
  `BulkSettleDialog`, `SettlementsList`) e `components/movements/` (`MovementForm`, `MovementTable`).
- **Substituições:** remover `PagamentoModal` e a lista/confirmação de Receipts da Sale; seção
  "Recebimentos" passa a ler a conta RECEIVABLE (`GET /obligations?origin_type=SALE&origin_id=`);
  Purchase idem com `origin_type=PURCHASE`; remover o form de pagamento da compra.
- **Financeiro:** novos blocos em `financeiro/page.tsx` (despesas, resultado, saldos por tipo de
  credor) e links de drill-down para `/contas` e `/movimentacoes?unallocated_only`.
- **Erros:** `APIError.message` em toast/erro de formulário; 409 nunca engolido; warnings da
  resposta exibidos como aviso.
- **Menu:** "Contas" e "Movimentações" no `layout.tsx`.

## Passos de implementação

1. Tipos, rótulos e badges; `Supplier.kind` em types e formulário de fornecedores + filtro em `catalogos`.
2. `lib/obligations.ts` e schemas/payloads puros; hooks SWR.
3. Lista `/contas` (abas, filtros, URL, totais, paginação).
4. Detalhe `/contas/[id]`: componentes, parcelas (editor + gerar), quitações, PATCH de prazo/notas.
5. `SettleDialog` (Pagar/Receber) e desfazer quitação.
6. Seleção múltipla + `BulkSettleDialog` com aviso `MIXED_COUNTERPARTIES`.
7. `/movimentacoes`: lista, criar, corrigir, anular.
8. Sale: trocar Receipts pela conta RECEIVABLE e contas PAYABLE; remover `PagamentoModal`.
9. Purchase: trocar pagamento único pelas contas PAYABLE.
10. Financeiro: despesas, resultado, saldos por tipo; drill-downs.
11. Alertas: rótulos/links dos novos tipos; menu; atualizar `CLAUDE.md` e `docs/changelog.md`.
12. Verificação (tsc, lint, build, testes abaixo).

## Arquivos / módulos afetados

- `lib/types.ts`, `lib/formatters.ts`, `lib/schemas.ts`, `lib/obligations.ts` (novo), `lib/finance.ts`.
- `hooks/useObligations.ts`, `hooks/useFinancialMovements.ts` (novos), `hooks/useFinance.ts`, `hooks/useVendas.ts`.
- `app/(app)/contas/page.tsx`, `contas/[id]/page.tsx`, `movimentacoes/page.tsx` (novos).
- `app/(app)/vendas/[id]/page.tsx`, `compras/[id]/page.tsx`, `catalogos/` (fornecedores),
  `financeiro/page.tsx`, `layout.tsx`, alertas (componente de notificações).
- `components/obligations/*`, `components/movements/*` (novos), `components/status-badges.tsx`;
  remoção de `components/forms/PagamentoModal.tsx`.
- `CLAUDE.md` (estrutura e tabela de status), `docs/changelog.md`.

## Testes (ver docs/conventions.md)

Sem test runner no repo (como SPEC-002/004). Se um runner for adotado, cobrir os itens abaixo;
até lá, verificação manual guiada pelos cenários e scripts avulsos (Node, `--experimental-strip-types`).

- **Aceite (um por cenário):**
  - Listas, filtros/URL, totais, paginação → `lib/obligations.ts` (parse/serialize) + conferência da query enviada.
  - Detalhe, PATCH, PUT/generate de parcelas → validação Σ ≤ amount e payloads (`installmentsSchema`, `generateInstallmentsSchema`).
  - Pagar/Receber, 409, Sale cancelada → payload de `/settle` e tratamento de erro/toast.
  - Pagar várias → seleção mesma direção, default das alocações, aviso de credores mistos.
  - Desfazer quitação, movimentações (criar/corrigir/anular) → payloads e sinal por categoria.
  - Supplier kind → payload e filtro. Financeiro → renderização dos novos blocos e links. Substituições Sale/Purchase e alertas → verificação manual.
- **Unit/integração:** helpers puros acima; `npx tsc --noEmit`, `npm run lint`, `npm run build`;
  conferência contra a API real (SPEC-008@api) por fluxo ponta a ponta: parcelar, pagar parcial
  (cobertura das parcelas mais antigas), Pix em 2 contas, anular movimentação.

## Casos de borda & fora de escopo

- Borda: conta sem credor ("A definir"); conta com `amount` 0 (Sale cancelada); `OVERSETTLED`
  (destacar para ajuste de quitação); movimentação com `unallocated` > 0; parcelas ao gerar com
  `amount` ≠ open; arredondamento (centavos na última — calculado pela API); dois cliques no
  submit (botão desabilitado em loading); fuso America/Sao_Paulo nas datas `dd/MM/yyyy`.
- Fora: edição de componentes e credor por componente (AYD-008/009); serviços (AYD-010);
  conta bancária, saldo, transferência, aporte/retirada (RF-22); despesa recorrente / conta
  sem compra ou venda; estorno ao cliente; criação manual de contas.

## Checklist de entrega

- [x] Tipos, rótulos, badges e `Supplier.kind` (cadastro + filtro)
- [x] `/contas` com abas, filtros na URL, totais e paginação
- [x] `/contas/[id]` com componentes, parcelas (editar/gerar), quitações, PATCH
- [x] Pagar/Receber e pagar várias contas com aviso `MIXED_COUNTERPARTIES`; 409 visíveis
- [x] `/movimentacoes` (lista, criar despesa/`OTHER_INCOME`, corrigir, anular)
- [x] Sale e Purchase sem Receipts/pagamento único (UI e chamadas removidas)
- [x] Financeiro com despesas, resultado e saldos por tipo de credor
- [x] Alertas de conta a pagar e menu
- [x] tsc, lint, build sem novos erros (build verificado; conferência ponta a ponta contra SPEC-008@api pendente da API)
- [x] `CLAUDE.md` e `docs/changelog.md` atualizados
