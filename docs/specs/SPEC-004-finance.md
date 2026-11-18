---
id: SPEC-004
type: spec
title: Financeiro — forma de pagamento, saldos da Sale e painel entra × sai (web)
status: done
updated: 2026-11-18
parents: [AYD-004@context]
related: [PDR-001@context, ADR-001@context, AYD-002@context, GLO]
---

# Spec: Financeiro (parte deste repo — web)

> O QUÊ e COMO este repo cumpre o AYD-004. `done` = implementado.

## Objetivo

Papel deste repo no AYD-004 (RF-10, RF-11, RF-14, RF-15, RF-32 / RN-04, RN-05, RN-06, RN-08):

- **Receipt** com **payment method**: obrigatório ao receber, opcional ao agendar; exibido
  na lista; confirmação pede a forma;
- **Sale**: mostrar `receivable` (A receber) e `freight_payable` (Frete a pagar); filtros
  `freight_pending`, `commission_pending`, `from`, `to` na lista; validação do Freight;
- tela **Financeiro**: vendas do período (competência), movimento do período (datas de
  pagamento) e saldos em aberto hoje, com drill-down para as listas;
- item de menu "Financeiro".

Este repo **consome** o contrato do AYD-004; não redefine enums, payloads nem regras. Os
alertas (RF-19) não mudam no web: a API passa a gerá-los na leitura.

## Critérios de aceite

```gherkin
Cenário: Receipt já recebido exige forma de pagamento
  Dado o modal "Registrar Recebimento" com tipo "Recebido"
  Quando o dono não escolhe a forma de pagamento
  Então o erro "Forma de pagamento é obrigatória para recebimentos" aparece e nada é enviado
  E com "Pix" é enviado POST /vendas/{id}/pagamentos {valor, status:"recebido", data_pagamento, payment_method:"PIX"}

Cenário: Receipt agendado tem forma opcional
  Quando o dono agenda um Receipt sem forma de pagamento
  Então é enviado sem payment_method e o Receipt nasce pendente

Cenário: Confirmar Receipt pendente pergunta a forma
  Dado um Receipt pendente
  Quando o dono clica em confirmar
  Então o diálogo pede data e forma de pagamento (pré-selecionada se o Receipt já tiver uma)
  E o botão Confirmar fica desabilitado sem a forma
  E é enviado POST .../confirmar {data_pagamento, payment_method}

Cenário: Lista de Receipts mostra a forma
  Então cada linha mostra Pix/Dinheiro/Cartão/Boleto/Transferência; sem forma, "Não informado"

Cenário: Sale cancelada
  Dado delivery_status CANCELED
  Então as ações de Receipt não aparecem (página somente leitura, SPEC-002)
  E um 409 da API ("venda cancelada: recebimentos bloqueados") aparece como toast

Cenário: Saldos da Sale
  Então o detalhe mostra "A Receber" = receivable e "Frete a Pagar" = freight_payable

Cenário: Validação do Freight
  Quando o dono salva frete pago maior que o frete (ou valores negativos)
  Então a mensagem aparece e PUT /vendas/{id} não é enviado

Cenário: Filtros vindos do painel
  Dado /vendas?freight_pending=true (ou commission_pending=true, from, to)
  Então a lista vem de GET /vendas com esses parâmetros
  E um chip "Filtro: Frete a pagar" removível indica o filtro ativo

Cenário: Painel Financeiro
  Quando o dono abre /financeiro
  Então o período padrão é o mês corrente e vem de GET /finance/summary?from&to
  E "Vendas do período", "Movimento do período" (com recebido por forma) e
      "Saldos em aberto (hoje)" são exibidos
  E os cartões de saldo levam a /vendas?payment_status=PENDING,PARTIAL,
      /compras?payment_status=PENDING, /vendas?freight_pending=true e
      /vendas?commission_pending=true; "Ver vendas" leva a /vendas?from&to
  E trocar o período (atalho ou datas) atualiza a URL e o painel
```

## Contratos consumidos

_Referência ao AYD-004@context — apenas consumo:_

- `PaymentMethod` (PIX | CASH | CARD | BOLETO | TRANSFER); `payment_method` no Receipt.
- `POST|PUT /vendas/{id}/pagamentos[/{pagId}]`, `POST .../confirmar`, `DELETE` (agora
  soft-delete na API; UX inalterada); erros 400/404/409.
- Sale: `receivable`, `freight_payable`; filtros `freight_pending`, `commission_pending`,
  `from`, `to`; `PUT /vendas/{id}` com 400 para Freight inválido.
- `GET /finance/summary?from&to` → `{period, sales, cash, balances}`.

## Abordagem (como)

- **Tipos/rótulos:** `PaymentMethod`, `FinanceSummary` (+ blocos) em `lib/types.ts`;
  `PAYMENT_METHODS`, `PAYMENT_METHOD_LABELS`, `formatPaymentMethod` em `lib/formatters.ts`.
- **Schema** (`lib/schemas.ts`): `receiptSchema` + `toReceiptPayload` (puros). Forma
  obrigatória só quando `tipo = recebido`; `""` vira ausente no payload.
- **Receipts:** `PagamentoModal` (select de forma), diálogo de confirmação na página da Sale
  (forma obrigatória, pré-selecionada), coluna "Forma" na lista. Erros da API (incl. 409)
  via toast com `APIError.message`. Sale cancelada já é somente leitura (SPEC-002).
- **Sale:** resumo usa `receivable`/`freight_payable`; `validateFreight` (`lib/sales.ts`)
  antes do PUT. Lista: filtros novos em `useVendas` e na URL, chip removível.
- **Financeiro:** `hooks/useFinance.ts` (SWR), `lib/finance.ts` (atalhos de período,
  parse/validação, puros), página `app/(app)/financeiro/page.tsx`; menu "Financeiro".

## Arquivos / módulos afetados

- `lib/types.ts`, `lib/formatters.ts`, `lib/schemas.ts`, `lib/sales.ts`, `lib/finance.ts` (novo).
- `hooks/useVendas.ts`, `hooks/useFinance.ts` (novo).
- `components/forms/PagamentoModal.tsx`, `app/(app)/vendas/[id]/page.tsx`,
  `app/(app)/vendas/page.tsx`, `app/(app)/financeiro/page.tsx` (novo), `app/(app)/layout.tsx`.

## Testes (ver docs/conventions.md)

Sem test runner no repo (como na SPEC-002) — **testes automatizados não adicionados**.
Verificação: `npx tsc --noEmit`, `npm run lint` (0 erros, sem novos warnings),
`npm run build`; os helpers puros de `lib/finance.ts` (atalhos, parse, validação) foram
conferidos com um script avulso (Node, `--experimental-strip-types`) para uma data fixa.

## Desvios / interpretações

- **Filtro de datas da lista de Sales:** os inputs De/Até passam a enviar `from`/`to`
  (AYD-004) em vez de `data_inicio`/`data_fim`; a URL ainda aceita os nomes legados na leitura.
- **Sale:** `a_receber`/`a_pagar_frete` permanecem em `Venda` (legado), mas a UI só usa
  `receivable`/`freight_payable`.
- **"Este mês"** = do dia 1º até hoje (mesmo default da API); "Últimos 90 dias" = hoje − 89
  dias até hoje (90 dias inclusivos); "Este ano" = 1º/jan até hoje.
- **Receipt pendente sem forma** aparece como "Não informado" na coluna Forma.
- **Saldo do movimento** (recebido − pago a fornecedores) é calculado no cliente só para
  exibição; não faz parte do contrato.
- **Edição (PUT) de Receipt recebido legado** exige escolher a forma (AYD-004).
- **Período inválido** (from > to ou data vazia): o painel não chama a API e mostra a mensagem.

## Checklist de entrega

- [x] Forma de pagamento no formulário (obrigatória ao receber), na confirmação e na lista
- [x] 409 visível; Sale cancelada sem ações de Receipt
- [x] `receivable` e `freight_payable` no detalhe; validação do Freight
- [x] Lista de Sales: `freight_pending`, `commission_pending`, `from`, `to` + chip
- [x] Tela Financeiro (período + URL, três blocos, drill-down, loading/erro) e menu
- [ ] Testes automatizados — sem test runner no repo
- [x] `docs/changelog.md` e `CLAUDE.md` atualizados
