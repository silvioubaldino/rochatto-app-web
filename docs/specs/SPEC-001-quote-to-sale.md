---
id: SPEC-001
type: spec
title: Espinha Quote → Sale (telas de Orçamento)
status: review
updated: 2026-07-16
parents: [AYD-001@context]
related: [GLO, ADR-001@context]
---

# Spec: Espinha Quote → Sale (parte deste repo — web)

> O QUÊ e COMO este repo cumpre o AYD-001. `approved` = contrato local congelado;
> `done` = implementado (este documento vira o registro histórico da entrega).

## Objetivo

Papel deste repo no AYD-001 (RF-05, RF-06, RF-07 / RN-01, RN-02, RN-07): entregar as
telas de **Orçamento** (rótulo visível ao dono; entidade **Quote** no contrato) que
permitem:

- listar Quotes com filtro por status (OPEN/WON/LOST) e período, com busca;
- emitir um Quote com Items (Product, quantidade, preço unitário **editável** por Item,
  custo unitário, Supplier) e Partner/lead source opcional;
- marcar um Quote como perdido (com motivo opcional);
- converter um Quote ganho em Sale, navegando para a página da Sale criada, que passa a
  exibir o Quote de origem.

Este repo **consome** os endpoints `/quotes` já definidos no AYD-001; não redefine
payloads, enum `QuoteStatus` nem regras de transição — essas vivem no AYD/ADR-001.

## Critérios de aceite

```gherkin
Cenário: Listar Quotes com filtro por status e período
  Dado que existem Quotes com status OPEN, WON e LOST
  Quando o dono acessa a lista de Orçamentos e filtra por status "OPEN" e por um período
  Então somente os Quotes OPEN dentro do período informado aparecem na lista

Cenário: Emitir um novo Quote com Items e preço editável
  Dado que o dono está no formulário de novo Orçamento
  Quando ele seleciona um Customer, adiciona um ou mais Items (Product, quantidade,
    preço unit., custo unit., Supplier) ajustando o preço unitário de um Item
  Então o Quote é criado via POST /quotes com status OPEN e o total exibido é a soma de
    quantity*unit_price de cada Item

Cenário: Marcar Quote como perdido com motivo opcional
  Dado um Quote com status OPEN
  Quando o dono aciona "Marcar como perdido" e informa (ou não) um motivo
  Então é enviado PATCH /quotes/{id}/status {status:"LOST", lost_reason} e o Quote passa
    a ser exibido como LOST, somente leitura

Cenário: Converter Quote ganho em Sale
  Dado um Quote com status OPEN
  Quando o dono aciona "Converter em Sale"
  Então é enviado POST /quotes/{id}/convert, o Quote passa a WON e o dono é redirecionado
    para a página da Sale criada (sale_id retornado), que exibe o Quote de origem

Cenário: Quote não-OPEN é somente leitura
  Dado um Quote com status WON ou LOST
  Quando o dono abre o detalhe desse Quote
  Então os Items e o cabeçalho aparecem sem controles de edição, e as ações "Editar",
    "Marcar como perdido" e "Converter em Sale" não ficam disponíveis

Cenário: Erro ao converter Quote sem Items
  Dado um Quote OPEN sem nenhum Item
  Quando o dono aciona "Converter em Sale"
  Então a API responde 422 e a tela exibe mensagem de erro sem navegar
```

## Contratos consumidos/expostos

_Referência ao AYD-001 — este repo NÃO redefine nada abaixo, apenas consome:_

- `GET /quotes` (filtros: `status`, `from`, `to`, `customer_id`, `q`)
- `POST /quotes` (cabeçalho + `items[]`)
- `GET /quotes/{id}` (Quote + items + `total_quote` via view)
- `PUT /quotes/{id}` (edita cabeçalho, só enquanto `OPEN`)
- `DELETE /quotes/{id}` (soft-delete)
- `GET/POST/PUT/DELETE /quotes/{id}/items` (CRUD de Items, só enquanto `OPEN`)
- `PATCH /quotes/{id}/status` `{status: "OPEN"|"LOST", lost_reason}`
- `POST /quotes/{id}/convert` → `{sale_id, quote_id}`
- Enum `QuoteStatus: OPEN | WON | LOST`
- Erros padrão: `400/404/409/422` (ver AYD-001, seção Erros)

A Sale (`GET /vendas/{id}` legado) passa a trazer `quote_id`; a tela de detalhe da Sale
exibe o vínculo (fora do escopo desta SPEC alterar o endpoint de Sale — apenas o consumo
do campo já previsto no contrato).

## Abordagem (como)

- Nova área `app/(app)/orcamentos/` espelhando a estrutura já usada em `vendas/`
  (lista / novo / detalhe), reaproveitando os mesmos padrões: SWR para leitura
  (`hooks/useQuotes.ts`, `hooks/useQuote.ts`), `react-hook-form` + `zod` para o
  formulário de emissão, componentes shadcn existentes (`Card`, `Button`, `Input`,
  `Dialog`, `MoneyInput`, `Label`, `Skeleton`) e o autocomplete de Customer/Product/
  Supplier já usado em `vendas/nova/page.tsx`.
- Campos e rotas do contrato ficam em **inglês** (`customer_id`, `unit_price`, `status`,
  `OPEN|WON|LOST`) — sem tradução para PT nos payloads/tipos, conforme ADR-001; os
  rótulos visíveis na UI continuam em PT-BR ("Orçamento", "Cliente", "Marcar como
  perdido" etc.).
- Rota base de API: `/quotes` (novo — distinto do legado `/vendas`); usa o mesmo
  `lib/api.ts` (`apiFetch`/`api.get/post/put/delete`) sem alterações nesse módulo.
- Tela de lista replica o padrão de `vendas/page.tsx`: filtros na URL (`status`, `from`,
  `to`, `q`), tabela com badge de status, clique na linha navega ao detalhe.
- Formulário de novo Quote replica `vendas/nova/page.tsx`: `useFieldArray` para Items,
  cálculo de `total_quote` em tempo real (client-side, apenas para exibição — o valor
  oficial vem da view no `GET`), autocomplete de Customer/Product/Supplier, campo
  opcional de `referrer_id` (Partner/lead source).
- Tela de detalhe do Quote: cabeçalho + Items (edição inline só se `status === "OPEN"`),
  botão "Marcar como perdido" (abre modal com campo de motivo opcional) e botão
  "Converter em Sale" (confirmação + chamada a `/convert`, depois `router.push`
  para `/vendas/{sale_id}`). Quando `status !== "OPEN"`, todos os controles de edição
  ficam ocultos/desabilitados (somente leitura).
- Tela de detalhe da Sale (`app/(app)/vendas/[id]/page.tsx`): adicionar um bloco/linha
  "Originado do Orçamento #<quote_id>" com link para `/orcamentos/{quote_id}`, exibido
  apenas quando `venda.quote_id` estiver presente.
- Novo enum/tipos em `lib/types.ts`: `QuoteStatus`, `Quote`, `QuoteItem`; e adicionar
  `quote_id?: string` em `Venda` (a API já retorna esse campo por contrato).
- Novos rótulos/cores de status em `lib/formatters.ts` (`QUOTE_STATUS_LABELS`,
  `QUOTE_STATUS_COLORS`), seguindo o padrão de `STATUS_LABELS`/`STATUS_COLORS` já
  existente para `StatusVenda`.
- Navegação: novo item de menu "Orçamentos" no layout `app/(app)/layout.tsx` (mesmo
  padrão dos itens existentes).

## Passos de implementação

1. `lib/types.ts`: adicionar `QuoteStatus`, `Quote`, `QuoteItem`; adicionar `quote_id?`
   em `Venda`.
2. `lib/formatters.ts`: adicionar `QUOTE_STATUS_LABELS` e `QUOTE_STATUS_COLORS`.
3. `hooks/useQuotes.ts`: lista com filtros (`status`, `from`, `to`, `customer_id`, `q`),
   padrão análogo a `hooks/useVendas.ts`.
4. `hooks/useQuote.ts`: detalhe por id, padrão análogo a `hooks/useVenda.ts`.
5. `app/(app)/orcamentos/page.tsx`: lista + filtros (status/período/busca) + botão
   "Novo Orçamento".
6. `app/(app)/orcamentos/novo/page.tsx`: formulário de emissão (Customer, Partner/lead
   source opcional, Items com preço/custo editáveis, total calculado) → `POST /quotes`
   → navega para `/orcamentos/{id}`.
7. `app/(app)/orcamentos/[id]/page.tsx`: detalhe do Quote — cabeçalho, Items (CRUD
   inline só quando `OPEN`), ação "Marcar como perdido" (modal com motivo opcional →
   `PATCH /quotes/{id}/status`), ação "Converter em Sale" (`POST /quotes/{id}/convert`
   → `router.push("/vendas/{sale_id}")`); somente leitura quando `WON`/`LOST`.
8. `app/(app)/vendas/[id]/page.tsx`: exibir vínculo ao Quote de origem quando
   `venda.quote_id` existir (link para `/orcamentos/{quote_id}`).
9. `app/(app)/layout.tsx`: adicionar item de navegação "Orçamentos".
10. Testes de aceite mapeando os cenários Gherkin acima + testes unitários dos hooks e
    do cálculo de total no formulário.
11. Atualizar `docs/changelog.md` (Unreleased) com 1 linha resumindo a entrega.

## Arquivos / módulos afetados

- `lib/types.ts` — novos tipos `Quote`, `QuoteItem`, `QuoteStatus`; `Venda.quote_id`.
- `lib/formatters.ts` — labels/cores de `QuoteStatus`.
- `hooks/useQuotes.ts` (novo), `hooks/useQuote.ts` (novo).
- `app/(app)/orcamentos/page.tsx` (novo), `app/(app)/orcamentos/novo/page.tsx` (novo),
  `app/(app)/orcamentos/[id]/page.tsx` (novo).
- `app/(app)/vendas/[id]/page.tsx` (alterado — exibir Quote de origem).
- `app/(app)/layout.tsx` (alterado — item de menu).
- Reaproveitados sem alteração: `lib/api.ts`, componentes `components/ui/*`
  (`Card`, `Button`, `Input`, `MoneyInput`, `Dialog`, `Skeleton`, `Label`), padrão de
  autocomplete já usado em `vendas/nova/page.tsx`.

## Testes (ver docs/conventions.md)

- **Aceite (mapeia os critérios acima):** um teste por cenário Gherkin — listar/filtrar
  Quotes, emitir com Items e preço editável, marcar perdido com/sem motivo, converter em
  Sale e navegar, somente-leitura em WON/LOST, erro 422 ao converter sem Items.
- **Unit/integração:** `hooks/useQuotes.ts`/`useQuote.ts` (mock de `api.get`); cálculo de
  `total_quote` no formulário (soma `quantity*unit_price`); mapeamento de `QuoteStatus`
  para label/cor; comportamento condicional de somente-leitura conforme `status`.

## Casos de borda & fora de escopo

- **Borda:** Quote sem Items ao tentar converter (erro 422, mensagem exibida sem
  navegação); reabertura de Quote `LOST → OPEN` (permitida pelo contrato — expõe a
  mesma ação de mudar status, revertendo `lost_reason`); Quote `WON` é terminal na UI
  (sem qualquer ação de edição/perda/conversão).
- **Fora:** origem do Item (from stock/made-to-order), Purchase, Stock/Outflow —
  próximo AYD, não tratado nesta SPEC; revisões de Quote com histórico (RF-08, Should,
  fora do MVP); qualquer alteração ao endpoint de Sale além de exibir `quote_id`.

## Checklist de entrega

- [x] Lista de Orçamentos com filtro por status/período (`from`/`to`) e por cliente
- [x] Formulário de emissão com Items e preço unitário editável por Item
- [x] Ação "Marcar como perdido" com motivo opcional (`PATCH /quotes/{id}/status`)
- [x] Ação "Converter em Sale" com navegação para a Sale criada
- [x] Sale exibe o Quote de origem quando houver `quote_id`
- [x] Quotes WON/LOST somente leitura (sem editar/perder/converter); LOST permite reabrir
- [ ] Testes de aceite cobrindo os 6 cenários Gherkin — **não implementado**: o repo não tem
      framework de testes configurado (sem Jest/Vitest/Playwright em `package.json`); os
      fluxos foram verificados via `tsc --noEmit`, `eslint` e `next build` (sem erros nas
      telas novas) e revisão manual do código contra os critérios de aceite — configurar um
      test runner é decisão de convenção de engenharia que precede esta SPEC
- [x] `docs/changelog.md` atualizado (Unreleased)
