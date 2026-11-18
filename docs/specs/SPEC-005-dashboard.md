---
id: SPEC-005
type: spec
title: Dashboard — KPIs do período, conversão e relatórios corrigidos (web)
status: done
updated: 2026-11-18
parents: [AYD-005@context]
related: [AYD-004@context, PDR-001@context, ADR-001@context, GLO]
---

# Spec: Dashboard (parte deste repo — web)

> O QUÊ e COMO este repo cumpre o AYD-005. `done` = implementado.

## Objetivo

Papel deste repo no AYD-005 (RF-16, RF-17, RF-18):

- dashboard passa a usar `GET /dashboard/kpis` (substitui `/dashboard/resumo`), com os
  mesmos atalhos de período do Financeiro (`lib/finance.ts`);
- cards do período (faturamento, Lucro, ticket médio, conversão Quote → Sale) e saldos em
  aberto hoje, cada um levando à lista que o compõe;
- corrigir o gráfico mensal e o ranking de Products (campos/datas errados);
- marcar "Venda rápida" nos Quotes (`quick_sale`).

Este repo **consome** o contrato do AYD-005; não o redefine.

## Critérios de aceite

```gherkin
Cenário: KPIs do período
  Quando o dono abre /dashboard
  Então o período padrão é o mês corrente (1º dia até hoje) e vem de GET /dashboard/kpis?from&to
  E aparecem Faturamento ("N vendas"), Lucro, Ticket médio e Conversão

Cenário: Conversão
  Dado conversion_rate 0.4237, created 59, won 25, open 10
  Então o card mostra "42%" e "25 de 59 orçamentos · 10 abertos"
  E com conversion_rate null (nenhum orçamento) mostra "—"
  E o texto de ajuda explica que vendas rápidas não entram

Cenário: Saldos em aberto (hoje) levam à lista
  Então A receber → /vendas?payment_status=PENDING,PARTIAL
  E A pagar fornecedores → /compras?payment_status=PENDING
  E Comissões pendentes → /vendas?commission_pending=true
  E Vendas a entregar → /vendas?delivery_status=TO_DELIVER

Cenário: Mesmo período do Financeiro
  Então os atalhos (Este mês, Mês passado, Últimos 90 dias, Este ano) e as datas De/Até
  são os de lib/finance.ts; "Este mês"/"90 dias"/"Este ano" terminam hoje
  E período inválido (from > to) não chama a API e mostra a mensagem

Cenário: Gráfico mensal
  Dado /relatorios/vendas?meses=N com N itens e mes "YYYY-MM-01"
  Então o eixo mostra "mmm/aa" corretamente, sem preencher meses no cliente
  E o tooltip mostra o nº de vendas do mês

Cenário: Ranking de Products
  Então cada linha mostra Produto, Vendas (total_vendas), Qtd com unidade ("12,5 m²"),
  Receita, Preço médio, Custo médio e Margem % lidos dos campos reais da API
  E produto_id null (Item legado) não gera chave duplicada
  E em telas estreitas a tabela rola na horizontal dentro do cartão

Cenário: Venda rápida
  Dado um Quote com quick_sale true
  Então a lista e o detalhe mostram o selo "Venda rápida" ao lado do status
```

## Contratos consumidos

- `GET /dashboard/kpis?from&to` → `{period, sales, quotes, balances, open_deliveries}`.
- `GET /relatorios/vendas?meses=N` → `{dados:[{mes:"YYYY-MM-01", total_venda, lucro, sales_count}]}`.
- `GET /relatorios/produtos?from&to` → `{dados:[{produto_id|null, produto_nome, total_vendas,
  unit|null, total_quantidade, total_receita, preco_medio, custo_medio, margem_media_percent}]}`.
- Quote: `quick_sale` (somente leitura).
- Alertas (`/dashboard/notificacoes`) sem mudança de contrato; tipo alinhado ao JSON real.

## Abordagem (como)

- **Tipos** (`lib/types.ts`): `DashboardKpis`; `ProdutoMaisVendido`, `VendasPorMes`,
  `Notificacao` corrigidos; `Quote.quick_sale`; `DashboardResumo` removido (sem uso).
- **Hooks** (`hooks/useDashboard.ts`): `useDashboardKpis(from, to, enabled)`;
  `useProdutosMaisVendidos(from, to, enabled)` envia `from`/`to`; `useDashboardResumo` removido.
- **Período:** `components/dashboard/PeriodSelector.tsx` (novo) reutiliza `FINANCE_PRESETS`,
  `financePresetPeriod`, `matchFinancePreset`, `validateFinancePeriod`; substitui o antigo
  `PeriodoSelector` (que usava fim de mês, no futuro).
- **Página:** grupos "No período" e "Hoje · em aberto"; `formatPercentRate` em
  `lib/formatters.ts` (0..1 → "42%", null → "—").
- **Gráfico/ranking:** `mes` parseado direto; `sales_count` no tooltip; tabela com
  `min-w` + `overflow-x-auto`; `formatQuantidade` + `unit`.
- **Quotes:** selo "Venda rápida" na lista e no detalhe.

## Arquivos / módulos afetados

`lib/types.ts`, `lib/formatters.ts`, `hooks/useDashboard.ts`,
`app/(app)/dashboard/page.tsx`, `components/dashboard/{PeriodSelector,VendasChart,ProdutosTable,AlertasPanel}.tsx`
(`PeriodoSelector.tsx` removido), `app/(app)/orcamentos/page.tsx`, `app/(app)/orcamentos/[id]/page.tsx`.

## Testes (ver docs/conventions.md)

Sem test runner no repo — **testes automatizados não adicionados**. Verificação:
`npx tsc --noEmit`, `npm run lint` (0 erros, sem novos warnings), `npm run build`.

## Desvios / decisões

- **Frete a pagar** aparece como subtítulo do card "Vendas a entregar" (não é card próprio);
  o drill-down `/vendas?freight_pending=true` segue no Financeiro.
- **Alertas — confirmação inline removida:** o JSON real de `/dashboard/notificacoes` não traz
  `pagamento_id` (e a confirmação exige forma de pagamento, AYD-004), então o botão
  "Confirmar Recebimento" do painel não funcionava. Ficou só "Ver Venda" (oculto se
  `venda_id` for null); o Receipt é confirmado na tela da Sale. Tipo vencido/vencendo vem de `tipo`.
- **Seletor de período do Financeiro** não foi refatorado para o componente compartilhado
  (só reutiliza a mesma lib); o dashboard não sincroniza o período na URL.
- **Gráfico:** botões 6/12 meses mantidos; sem preenchimento de meses no cliente.
- **Ranking:** exibe o top 10 dos 20 devolvidos (inalterado).
- Campo "to" personalizado não é limitado a hoje (igual ao Financeiro); presets terminam hoje.

## Checklist de entrega

- [x] `/dashboard/kpis` + cards do período e saldos com drill-down
- [x] Conversão (%, "—" se null, ajuda sobre vendas rápidas) e ticket médio
- [x] Gráfico mensal corrigido (+ `sales_count`) e ranking com campos reais e `unit`
- [x] Período com os mesmos presets do Financeiro
- [x] Selo "Venda rápida" nos Quotes
- [ ] Testes automatizados — sem test runner no repo
- [x] `docs/changelog.md` e `CLAUDE.md` atualizados
