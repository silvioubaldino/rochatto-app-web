---
id: SPEC-013
type: spec
title: Jornada do dono e UX do web — base de componentes, navegação, Hoje, fechamento da venda, criação rápida e mesma experiência no celular (web)
status: draft
updated: 2026-11-22
parents: [AYD-011@context]
children: []
related: [GLO, ADR-001@context, TDR-001]
---

# Spec: Jornada do dono e UX do web (parte deste repo — web)

> O QUÊ e COMO o web cumpre o **AYD-011** (§5 UX, §9 arquitetura normativa, §10 fases,
> §11 aceite). O web **consome** os contratos C1–C10 da api (SPEC-012@api); não os redefine.
> Plano em fases **U0–U5**, cada uma publicável sozinha. **U0 e U1 foram entregues nos
> primeiros commits do PR desta spec** (marcados abaixo); U2–U5 seguem sobre a fundação.
> `draft` até o dono validar as questões em aberto do AYD-011 §13; vira `done` quando U5 sair.

## Objetivo

Trocar o web "uma tela por tabela" por um web **por intenção**, com uma **base de componentes**
que torne cada feature seguinte barata e consistente, e com **a mesma experiência no
navegador do celular e do desktop** (UX-11 / UX-P13 — critério de aceite duro, não fase
final):

- **Hoje** como página inicial, com as pendências acionáveis (RF-42, C10).
- **Fechar venda** num diálogo (T05, C5) — o termo "Sale" sai da UI (F11).
- **Criar sem sair** (UX-3): todo seletor de entidade é um combobox com "＋ Criar '…'".
- **Links e prévia** (UX-4): toda entidade citada é link; referências abrem prévia lateral.
- Navegação por intenção (menu agrupado, barra inferior no celular), busca global (⌘K) e "Novo" global.
- Páginas 360 (Cliente, Parceiro, Fornecedor), editor único de Items, detalhe padrão,
  fluxo único de Pagar/Receber.
- Cumprir RNF-03: 360 px sem rolagem lateral, alvos ≥ 44 px, fonte ≥ 16 px nos campos,
  WCAG 2.2 AA, INP ≤ 200 ms / LCP ≤ 2,5 s no celular em 4G.

Nenhuma regra de negócio muda (RN-01 a RN-17).

## Critérios de aceite

Os cenários do AYD-011 §11 valem integralmente (Hoje, criar sem sair, fechar venda, orçamento
ganho leva à venda, listas mostram os Items, voltar preserva contexto, busca por número,
celular, **mesma experiência no navegador do celular**, resposta imediata no celular, voltar
do celular fecha o que está aberto). Os desta spec, por fase:

```gherkin
# --- U0 · Correções (entregue) ---
Cenário: Orçamento ganho leva à venda (F05)
  Dado um Quote WON com sale_id (campo opcional da api — C2)
  Quando o dono abre o orçamento
  Então vê "Virou a Venda nº N ›" com link para a venda
  E sem sale_number o link diz apenas "Venda"

Cenário: Coluna Items das listas (F04)
  Dado GET /quotes e GET /vendas com first_item_name e items_count (C3)
  Então a coluna "Items" mostra "Rock face e mais 2"
  E se a api ainda não traz o resumo (nem Items nas linhas) a coluna some, em vez de "—" em todas as linhas

Cenário: Voltar preserva o contexto (F08)
  Dado que o dono chegou ao detalhe vindo de uma lista filtrada ou de outra entidade
  Quando clica no voltar do cabeçalho
  Então volta pelo histórico do navegador (mesmo filtro, mesma origem)
  E se abriu o detalhe direto (link, recarga) vai para a lista da entidade

Cenário: Fechar venda (F11) e confirmação sem window.confirm
  Quando o dono clica "Fechar venda" num orçamento aberto
  Então um diálogo de confirmação do app (não o do navegador) pede a confirmação
  E nenhum texto da UI exibe "Sale"

Cenário: Filtro por cliente vindo da URL mostra o nome (F18)
  Dado /orcamentos?customer_id=<id> ou /vendas?cliente_id=<id>
  Então o filtro "Cliente" mostra o nome, não um campo vazio

Cenário: Abas na URL (F21)
  Dado /catalogos ou /estoque
  Quando o dono troca de aba e recarrega
  Então a aba escolhida continua (?tab=)

Cenário: Guarda de alterações (F25)
  Dado o novo orçamento com dados digitados
  Quando tenta sair (menu, voltar, Cancelar, fechar a aba)
  Então é avisado de que perderá o que digitou, e pode continuar editando

# --- U1 · Fundação (entregue) ---
Cenário: Cliente criado no orçamento já fica selecionado
  Dado o campo Cliente do novo orçamento
  Quando o dono digita um nome inexistente e escolhe "＋ Criar cliente '…'"
  E salva o cadastro (aberto pré-preenchido, sem sair da tela)
  Então o cliente criado fica selecionado e o resto do formulário continua intacto

Cenário: Alvos de toque e fonte no celular
  Dado uma tela abaixo de md
  Então inputs, botões, gatilhos de select, abas e itens de menu têm ao menos 44 px de altura
  E campos de texto têm fonte de 16 px (sem zoom automático no iOS)

Cenário: Shell antes da autenticação
  Quando o app abre e a sessão ainda não resolveu
  Então a casca (barra inferior no celular, lateral no desktop) já aparece e o conteúdo é esqueleto
  E nunca há spinner de página inteira

Cenário: Lista vira cartões no celular
  Dado uma DataTable com 5 colunas
  Então no celular cada linha é um cartão (título, contexto, valor, status) e a linha é um link real
```

## Contratos consumidos/expostos

Consome (não redefine) os contratos do AYD-011 §6, entregues pela api (SPEC-012@api):

| Contrato | Uso no web | Fase |
|----------|------------|------|
| C1 `number` em Quote/Sale/Purchase | Títulos "Venda nº 98", prévias, buscas; sem ele cai no id curto | U2 (tipado opcional em U1) |
| C2 `sale_id`/`sale_number` no Quote; `customer_id`/`quote_date` no PUT | Banner "Virou a Venda" (U0); cabeçalho editável (U3) | U0 (tipado opcional) / U3 |
| C3 `items_count`/`first_item_name` nas listas | Coluna "Items" (F04) | U0 (tipado opcional) |
| C4 filtros `q`, `referrer_id` | Listas, Parceiro 360 | U3 |
| C5 `closing` na conversão e na venda rápida | Diálogo **Fechar venda** | U3 |
| C6 `PATCH /vendas/{id}/itens/fulfillment` | Atendimento em lote | U3 |
| C7 `stock_balance` no Item | Aviso de saldo persistente | U3 |
| C8 `default_supplier_id` no Product | Sugestão de fornecedor | U3 |
| C9 `GET /search` | ⌘K / busca no topo | U2 |
| C10 `GET /pending-actions` | Tela **Hoje**, badge do menu | U2 |

Em U0/U1 só os campos **opcionais** de C1–C3 foram tipados (`lib/types.ts`); nenhuma chamada
nova à api. Contrato divergente → sinalizar e voltar ao AYD (regra do repo), nunca adaptar localmente.

## Abordagem (como)

Arquitetura **normativa** do AYD-011 §9; ferramentas e convenções no **TDR-001**.

### Estrutura (AYD-011 §9.2)

```
app/(app)/<rota>/page.tsx   só compõe features (≤ 80 linhas)
features/<domínio>/         api · queries · mutations · schemas · model · components · previews
components/ui/              shadcn/Base UI (só aqui a variante de toque do celular foi ajustada)
components/patterns/        padrões sem domínio (AppShell, DataTable, FilterBar, ResponsiveDialog…)
components/entity/          cola de entidade (EntityCombobox, QuickCreate, EntityLink, EntitySheet)
lib/http.ts · lib/errors.ts · lib/format/ · lib/events.ts · lib/mutation.ts · lib/history.ts
```

Dependências só descem: `app → features → components/{entity,patterns} → components/ui → lib`.
`components/entity` **não importa** features: formulários de criação rápida e prévias se
**registram** em `features/register.ts` (importado uma vez pelo layout).

### Camada de dados e invalidação

- `lib/http.ts`: cliente autenticado (espera o Firebase resolver; **não** falha com 401 antes);
  erros tipados `ApiError { status, message, field }` (`lib/errors.ts`, sem rede, importável
  por componentes). `lib/api.ts` é um re-export fino (telas antigas).
- **Eventos de domínio** (`lib/events.ts`): `SALE_CHANGED`, `QUOTE_CHANGED`, `PURCHASE_CHANGED`,
  `MONEY_MOVED`, `STOCK_CHANGED`, `CATALOG_CHANGED`, `CUSTOMER_CHANGED`, `PARTNER_CHANGED`,
  `SUPPLIER_CHANGED` → prefixos de chave SWR (as chaves são os caminhos da api). **Fonte única**;
  proibido revalidar chaves à mão fora dele. `useEmit()` revalida; `eventKeyFilter()` serve a
  `mutate(filtro)`. `isAccountingKey`/`isPurchaseRelatedKey` legados agora delegam ao mapa.
- `lib/mutation.ts` → `useApiMutation({ run, emits, successMessage, errorFallback, toastOnError })`:
  executa, emite os eventos, avisa o dono; devolve `{ mutate, pending, error }` (erro tipado para
  409 no próprio diálogo). `mutations.ts` de cada feature só embrulha isto.

### Padrões (AYD-011 §9.3) — API pública resumida

`StatusBadge` (`kind`+`value` ou `tone`), `MoneyText/QuantityText/DateText`,
`MoneyField/QuantityField/DateField/FieldShell`, `Select`, `EntityCombobox`, `QuickCreate`
(registro + pilha de diálogos), `EntityLink`, `EntitySheet` (`?peek=type:id`) + registro de
prévias, `DataTable` (ordenação, linha-link, cartões no celular, agrupamento, totais,
vazio/erro/esqueleto), `FilterBar` + `useUrlFilters`, `useUrlTab`, `DetailLayout` /
`PageHeader` / `NextStepBanner` / `SummaryAside` / `ActionBar`, `ResponsiveDialog`,
`ConfirmDialog` + `useConfirm` + `useUndoToast`, `useUnsavedChangesGuard`, `EmptyState` /
`ErrorState`, `PeriodSelector`, `AppShell`. Regras de apresentação puras em `*-model.ts` /
`model.ts`, todas com teste.

### Experiência no celular (UX-P13) — como vira código

- **Tokens** (`app/globals.css`): `success|warning|danger|info|neutral` × `base / -foreground /
  -subtle`, claro e escuro; utilitários `pt-safe`, `pb-safe`, `px-safe`; `viewport-fit=cover`.
  Mapa único de tom por status em `lib/format/tones.ts`.
- **Toque**: `Input`, `Button` (todos os tamanhos), `Select`, `Tabs`, itens de menu e chips têm
  `h-11 md:h-8` e `text-base md:text-sm` (≥ 44 px / 16 px abaixo de `md`) — variantes nas
  primitivas de `components/ui`, não nas telas.
- **Layout**: `AppShell` em `h-dvh` com barra inferior **fora** da área de rolagem (a barra de
  ação fixa dos detalhes fica logo acima dela); `main` com 16 px de respiro; diálogos e prévias
  em tela cheia com cabeçalho e ação fixos; tabelas → cartões (`DataTable`); resumo recolhível.
- **Estado na URL**: filtros, abas e prévia (`?peek=`) — "voltar" fecha a prévia antes de sair
  da tela; `useBack` usa o histórico quando a tela anterior é do app.
- **Carregamento**: shell antes da autenticação, esqueleto do formato final, nunca spinner de
  página; SWR com `keepPreviousData` nos seletores.
- **Lint** (`eslint.config.mjs`): `<select>` nativo, `<table>` fora do `DataTable`/`ItemsGrid`,
  cor crua do Tailwind e import de `@/lib/http|api` em componente — **erro** em `features/`,
  `components/patterns|entity`; **aviso** nas telas legadas (some conforme migram).

## Passos de implementação

> Cada fase é publicável sozinha e **cumpre UX-P13 no mesmo PR** (não existe fase "mobile").
> O componente antigo é removido no mesmo PR que migra a última tela que o usa (AYD §9.6).

### U0 · Correções — entregue

1. [x] F05 — banner "Virou a Venda nº N" no Quote WON (`sale_id` opcional).
2. [x] F04 — coluna "Items" por `first_item_name`/`items_count`; some se a api não traz.
3. [x] F08 — `useBack(fallback)` nos 6 cabeçalhos de detalhe (vendas, compras, contas, clientes, orçamento, novo).
4. [x] F11 — "Converter em Sale" → "Fechar venda" (e confirmação no `ConfirmDialog`).
5. [x] F18 — filtro por cliente (orçamentos e vendas) por `EntityCombobox`, que busca o nome pelo id da URL.
6. [x] F21 — abas de Catálogos e Estoque em `?tab=` (`useUrlTab`).
7. [x] F25 — `useUnsavedChangesGuard` em `orcamentos/novo`; cliente e parceiro por `EntityCombobox` (cria e seleciona).
8. [x] `window.confirm` → `ConfirmDialog`; `DeleteConfirmDialog`, `AlertDialog` de compra e de entrega delegam a ele.

### U1 · Fundação — entregue

1. [x] Ferramentas de teste e CI (TDR-001): Vitest + Testing Library + MSW, Playwright (+axe) com perfis desktop/iPhone/Pixel, Lighthouse CI, workflow lint → tsc → test → build (+ e2e/desempenho informativos).
2. [x] `lib/http.ts`, `lib/errors.ts`, `lib/format/`, `lib/events.ts` (+ `useEmit`), `lib/mutation.ts`, `lib/history.ts`, `lib/media.ts`; `lib/api.ts`/`lib/formatters.ts` como re-exports.
3. [x] Tokens semânticos + utilitários de área segura; variantes de toque nas primitivas.
4. [x] Padrões: `StatusBadge`, `*Text`, `*Field`, `Select`, `DataTable`, `FilterBar`/`useUrlFilters`, `DetailLayout` & cia, `ResponsiveDialog`, `ConfirmDialog`/`useConfirm`/`useUndoToast`, estados, `PeriodSelector`, `useUrlTab`, `useUnsavedChangesGuard`, `AppShell` (topo, lateral, barra inferior Hoje · Orçamentos · ＋ · Vendas · Mais).
5. [x] Entidade: `EntityCombobox`, registro `QuickCreate` (pilha) com formulários de cliente, produto, serviço, fornecedor e parceiro (`onSaved(entity)`), `EntityLink`, `EntitySheet` + prévias (cliente, venda, orçamento, compra, fornecedor, parceiro, produto).
6. [x] ESLint (regras 2 e 4 do §9.4); `AppShell` substitui `(app)/layout.tsx`; item "Hoje" → `/dashboard` por ora.

### U2 · Navegação e Hoje — a fazer (depende de C1, C9, C10)

1. `/hoje` (pendências agrupadas, ação por linha, horizonte 7/30 dias, resumo do mês) e badge = `total_overdue` no item Hoje; pós-login → `/hoje`.
2. Rotas novas com redirecionamento das antigas: `/indicadores`, `/parceiros`, `/fornecedores`, `/produtos`, `/servicos`, `/contas/receber`, `/contas/pagar` (só `NAV_GROUPS` e `entityHref` mudam).
3. `CommandPalette` (⌘K/Ctrl+K, `/`; no celular tela cheia pelo ícone de busca) com C9 e ações; menu "＋ Novo" completo (Venda rápida, Receber, Pagar, Despesa).
4. Títulos "Venda nº N" em lugar de `#id` (C1).

### U3 · Comercial — a fazer (C4–C8)

1. `ItemsGrid` (modos `quote`/`sale`; no celular, um cartão por linha) e editor de orçamento único (cabeçalho editável — C2).
2. **Fechar venda** (T05, C5) como `ResponsiveDialog`; venda rápida usa o mesmo diálogo.
3. Detalhe da venda no `DetailLayout` (T06): `nextStep(sale)` em `model.ts`, atendimento em lote (C6), aviso de saldo (C7), recebimento com `InstallmentPlanEditor`.
4. Cliente 360 e Parceiro 360; listas de Orçamentos e Vendas no `DataTable` + `FilterBar` (chips, `q`, `referrer_id`, cidade/agrupamento migrados).

### Entregue em U2/U3 (e o que ficou para as próximas fases)

- **U2:** `/hoje` (`features/home`), `CommandPalette` (`features/search`), menu Novo completo, rotas novas com redirecionamentos
  em `next.config.ts`, `docNumber`/`docTitle` (C1). Catálogos virou `components/catalogs/*` por rota (migrar para `DataTable` em U4/U5).
  Receber/Pagar nas pendências usam o `SettleDialog` atual (U5 traz o `SettleFlow` com "Desfazer").
- **U3:** `components/entity/items-grid`, `components/entity/installment-plan`, `features/closing` (`CloseSaleDialog`),
  `features/quotes`, `features/sales`, `features/customers`, `features/partners`. Removidos `SaleItemsCard`,
  `ProductPicker`, `ServicePicker`, `ChargesEditor`, `QuoteChargesCard`, `SaleDeliveryActions`, `city-view` e `useCityView` legados.
- **Fica para depois (sem alterar contrato):** coluna "Margem est." na lista de Orçamentos (a lista da api não traz custo);
  número da Sale nas linhas da Compra (`PurchaseSaleItem` só traz `sale_id`); `SaleCompositionCard`/`SaleCostModal`/`OriginObligations`
  (tabelas legadas) migram em U4/U5; "rascunho salvo" do editor de orçamento (sem rascunho no servidor).
- **E2E:** build com `NEXT_PUBLIC_E2E=1 NEXT_PUBLIC_API_URL=` entra como o dono e chama `/api/v1` no próprio servidor
  (`e2e/mock-api.ts`); `E2E_CHROME_PATH` permite rodar com um Chrome do sistema.

### U4 · Operação — a fazer

Compras e Compra (`nextStep(purchase)`, trilha de status, composição + rateio num cartão), Fornecedor 360, Estoque/Produto com prévia e "Comprar para estoque".

### U5 · Financeiro — a fazer

A receber / A pagar (chips, credor por combobox incluindo Partners — F13, agrupar por credor), `SettleFlow` (1..N contas, desfazer) no lugar de `SettleDialog`/`BulkSettleDialog`, `InstallmentPlanEditor`, Movimentações (Despesa / Receita avulsa), Resultado e Indicadores com o mesmo `PeriodSelector`.

## Arquivos / módulos afetados

- **U0/U1 (entregues):** `lib/{http,errors,events,mutation,history,media}.ts`, `lib/format/**`,
  `lib/{api,formatters}.ts`, `components/patterns/**`, `components/entity/**`, `features/**`,
  `components/ui/{input,button,tabs,dropdown-menu}.tsx`, `app/globals.css`, `app/layout.tsx`,
  `app/(app)/layout.tsx`, `components/forms/*Modal.tsx` (invólucros), `components/status-badges.tsx`,
  `components/DeleteConfirmDialog.tsx`, `components/sales/SaleDeliveryActions.tsx`,
  `app/(app)/{orcamentos,vendas,clientes/[id],compras/[id],contas/[id],catalogos,estoque}/**`,
  `hooks/{useObligations,usePurchases,useDashboard}.ts`, `eslint.config.mjs`, `vitest.config.ts`,
  `playwright.config.ts`, `lighthouserc.json`, `tests/**`, `e2e/**`, `.github/workflows/ci.yml`.
- **U2–U5:** páginas migram para `features/*` e removem os componentes antigos (`components/tables/*`,
  `components/sales/*Picker*`, `components/obligations/{SettleDialog,BulkSettleDialog,…}` etc.).

## Testes (ver docs/conventions.md e TDR-001)

- **Unitário (Vitest):** `lib/format`, `lib/events`, `lib/history`, todo `*-model.ts`
  (`data-table`, `url-filters`, `url-tab`, `unsaved-guard`, `entity`, `app-shell/nav`).
- **Componente (Testing Library + MSW, api simulada na fronteira de rede):** `EntityCombobox`
  (busca, teclado, **criar e auto-selecionar**, nome pelo id, filtro/preferência), `DataTable`
  (tabela, ordenar, linha-link, **cartões do celular**, agrupar, estados), `StatusBadge`,
  `ConfirmDialog`/`useConfirm`, campos (`MoneyField` etc.), `Select`, `FilterBar`,
  `ResponsiveDialog`, `EntitySheet`/`EntityLink`, `AppShell`.
- **E2E (Playwright + axe):** smoke da tela pública em `desktop`, `iphone` (WebKit) e `pixel`
  (Chromium), sem rolagem lateral e sem violação séria. A cada fase, as **tarefas-ouro TO-1..TO-7**
  nos três perfis, com a **mesma contagem de passos**, sem rolagem lateral e alvos ≥ 44 px
  (`e2e/helpers.ts`). Informativo no CI até U2+; depois bloqueia o PR.
- **Desempenho (Lighthouse CI, perfil celular com rede/CPU limitadas):** LCP ≤ 2,5 s, CLS ≤ 0,1 nas
  rotas Hoje, Orçamento, Fechar venda, Venda e A receber (a rota `/login` já é medida em U1).

## Casos de borda & fora de escopo

- Borda: api sem os campos C1–C3 (deploy desencontrado) — a web degrada (id curto, coluna
  "Items" oculta, banner só com link "Venda"); nada quebra.
- Borda: criar um cadastro de dentro de outro (parceiro dentro de cliente) empilha diálogos sem
  perder o de baixo (`QuickCreate` é uma pilha).
- Limitação: o botão voltar do navegador (`popstate`) não é interceptável pela guarda de
  alterações no App Router; a guarda cobre fechar/recarregar a aba e links/botões do app.
- Fora (AYD-011 §13): PWA, uso sem rede, notificação push, follow-up/agenda de orçamento (RF-23),
  revisões de Quote (RF-08), PDF/WhatsApp (RF-29), relatórios por cidade/ranking de parceiros.

## Checklist de entrega

- [x] U0 — F04, F05, F08, F11, F18, F21, F25 e `window.confirm` → `ConfirmDialog`
- [x] U1 — tokens, toque ≥ 44 px / 16 px, área segura/`dvh`, `AppShell` com barra inferior e shell antes da autenticação
- [x] U1 — `lib/http`, `lib/format`, `lib/events` + `useEmit`, `useApiMutation`
- [x] U1 — padrões, `EntityCombobox` + `QuickCreate`, `EntitySheet` + prévias, `DataTable`/`FilterBar`/`DetailLayout`, `ResponsiveDialog`, `ConfirmDialog`
- [x] U1 — ESLint (regras 2 e 4), testes (unitário, componente), Playwright com 3 perfis, Lighthouse CI, CI (lint → tsc → test → build)
- [x] U2 — Hoje, menu agrupado/rotas novas, ⌘K, "Novo" global, números humanos
- [x] U3 — `ItemsGrid`, editor de orçamento, Fechar venda, detalhe da venda, Cliente/Parceiro 360, listas migradas (pendências: ver "Entregue em U2/U3")
- [ ] U4 — Compras, Fornecedor 360, Estoque/Produto
- [ ] U5 — A receber/A pagar, `SettleFlow`, `InstallmentPlanEditor`, Movimentações, Resultado, Indicadores
- [ ] Zero aviso de lint `no-restricted-*` em `app/` e `components/` (legado migrado) e componentes antigos removidos
- [ ] Tarefas-ouro TO-1..TO-7 em e2e (desktop + iPhone + Pixel) e metas de desempenho verdes no CI — TO-1, TO-2, TO-3, TO-4 e TO-6 escritas (verdes em desktop e Pixel; iPhone/WebKit só no CI); faltam TO-5 e TO-7 (U5)
- [ ] Dono validou as questões em aberto (AYD-011 §13), em especial o aparelho de referência (nº 9)
