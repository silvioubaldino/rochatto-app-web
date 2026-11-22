# CLAUDE.md — Frontend: Sistema de Gestão de Vendas

## O que é este componente

Interface web em **Next.js 16** (App Router, React 19) que serve como ponto de interação do usuário com o sistema de gestão de vendas. Autentica via Google Login (Firebase Auth), consome a API REST do backend Go e exibe dashboards, formulários e listagens.

## Objetivo

Fornecer uma interface funcional, limpa e responsiva para:
- Login seguro via conta Google
- Cadastro e consulta de clientes, produtos (com categorias), fornecedores e parceiros (Partners)
- Orçamentos (Quotes) e conversão em venda — toda venda nasce de um orçamento (ou da venda rápida)
- Gerenciamento de vendas: origem de cada item (sob encomenda / de estoque) e fornecedor,
  status de entrega (a entregar / entregue / cancelada) e de pagamento (calculado)
- Compras ao fornecedor (consolidadas por fornecedor, fila "a comprar"; composição do custo com custos adicionais e credor editável, rateio e custo de entrada por linha — SPEC-009; pagamento pelas contas)
- Estoque com saldo calculado por produto (entradas, saídas, ajustes)
- Composição da venda: frete cobrado no orçamento/venda, custos da venda (frete pago, instalador, comissão, outro) com credor e lucro previsto — SPEC-010
- Serviços na venda: catálogo de Services e Items de serviço no orçamento/venda (sem origem/fornecedor; custo nos custos da venda), bloco "Serviços" no dashboard — SPEC-011
- Controle de recebimentos do cliente (parciais, agendados, confirmados)
- Visualização de indicadores financeiros no dashboard e alertas de pagamentos pendentes

## Stack

| Tecnologia | Versão | Papel |
|---|---|---|
| Next.js | 16 (App Router, Turbopack) | Framework React |
| React | 19 | UI library |
| TypeScript | 5+ | Tipagem estática |
| Tailwind CSS | 4 | Estilização utilitária |
| shadcn/ui (Base UI) | latest | Componentes de UI acessíveis |
| Firebase Auth | 12 | Autenticação Google Login |
| Recharts | 3 | Gráficos do dashboard |
| React Hook Form | 7 | Gerenciamento de formulários |
| Zod | 4 | Validação de schema |
| SWR | 2 | Data fetching e cache |
| date-fns | 4 | Formatação de datas |

## Arquitetura

```
App Router do Next.js — sem backend próprio (nenhuma Server Action ou Route Handler).
Toda a lógica de dados vai para a API Go via fetch no cliente.
```

```
app/
  (auth)/login/              → tela pública de login (aceita ?next= interno para voltar após o login)
  conectar/                  → consentimento do Assistant connector (?request_id=); FORA de (app) para preservar a query no login (SPEC-006)
  (app)/                     → layout protegido (redireciona se não autenticado)
    dashboard/               → página inicial — KPIs do período (conversão, ticket médio), saldos em aberto com drill-down, gráfico mensal, ranking de Products e alertas (SPEC-005)
    orcamentos/              → orçamentos: listagem, emissão (e venda rápida), detalhe/conversão; lista com cidade do cliente, filtro e agrupamento por cidade (SPEC-012)
    vendas/                  → listagem e detalhe (sem criação direta — nasce do orçamento): preço ao cliente (itens + frete cobrado) e custos da venda com credor e conta (SPEC-010); lista com cidade do cliente, filtro e agrupamento recolhível por cidade (SPEC-012)
    compras/                 → compras ao fornecedor, fila "a comprar", detalhe: composição (custos adicionais, rateio), contas e custo de entrada (SPEC-009)
    clientes/                → CRUD de clientes
    estoque/                 → saldo por produto, valor em estoque, extrato e ajustes
    financeiro/              → painel: vendas do período, movimento, despesas, resultado e saldos em aberto (SPEC-004, SPEC-008)
    contas/                  → contas a pagar/receber (abas, filtros na URL, pagar várias) e detalhe /contas/[id]: componentes, parcelas, quitações (SPEC-008)
    movimentacoes/           → dinheiro executado: lista, despesa/receita avulsa, corrigir, anular (SPEC-008)
    catalogos/               → produtos, serviços (SPEC-011), categorias, fornecedores, parceiros
    integracoes/             → Connections do Assistant connector: listar e desconectar (SPEC-006)
features/                    → um diretório por domínio (customers, partners, suppliers, catalog, sales, quotes, purchasing…): `mutations.ts` (escrita + eventos), `components/` (formulários `*Form`), `previews.tsx`; `register.ts` registra QuickCreate e prévias (SPEC-013, AYD-011 §9)
components/
  ui/                        → shadcn/ui (só editado para as variantes de toque do celular: `h-11 md:h-8`, `text-base md:text-sm`)
  patterns/                  → padrões sem domínio: AppShell, DataTable, FilterBar, ResponsiveDialog, ConfirmDialog, StatusBadge, campos (Money/Quantity/Date), Select, detalhe (DetailLayout…), PeriodSelector; regras puras em `*-model.ts` (SPEC-013)
  entity/                    → cola de entidade: EntityCombobox, QuickCreate (registro), EntityLink, EntitySheet (`?peek=type:id`) + registro de prévias
  forms/                     → invólucros legados `*Modal` (delegam aos `*Form` de features/)
  sales/ purchases/ stock/   → blocos das telas de venda, compra e estoque
  obligations/ movements/    → diálogos Pagar/Receber, pagar várias, parcelas e movimentações (SPEC-008)
  tables/                    → tabelas de listagem
  dashboard/                 → cards e gráficos
lib/
  http.ts / errors.ts        → cliente HTTP autenticado e `ApiError {status,message,field}` (`api.ts` = re-export legado)
  firebase.ts                → configuração do Firebase
  format/                    → dinheiro, data, quantidade+unidade, rótulos e TONS dos enums (`formatters.ts` = re-export legado)
  events.ts / mutation.ts    → eventos de domínio → chaves SWR (`useEmit`) e `useApiMutation` (escrita + eventos + toast)
  history.ts / media.ts      → `useBack` (voltar pelo histórico do app) e `useIsPhone`
  schemas.ts                 → schemas zod + montadores de payload
  sales.ts                   → payloads da Sale/Item (PUTs legados são de substituição completa)
  types.ts                   → tipos TypeScript espelhando os contratos da API
hooks/
  useAuth.ts                 → estado de autenticação do Firebase
  useVendas.ts               → SWR hook para vendas
  (um hook por recurso)
```

## Convenções obrigatórias

### Autenticação
- Toda requisição à API inclui `Authorization: Bearer <idToken>` do Firebase
- O `idToken` é obtido via `await user.getIdToken()` — ele expira em 1h, renovar automaticamente
- Páginas em `(app)/` verificam autenticação no layout — redirecionar para `/login` se não autenticado
- Nunca armazenar o token no localStorage — usar o estado do Firebase Auth

### Fetch e SWR
- Todas as chamadas à API passam pelo `lib/api.ts` — nunca usar `fetch` diretamente nos componentes
- Usar SWR para leitura de dados (cache, revalidação automática)
- Usar `fetch` direto (via `api.ts`) para mutations (POST, PUT, DELETE)
- Após mutation bem-sucedida: chamar `mutate()` do SWR para revalidar

### Formulários
- React Hook Form + Zod em todos os formulários
- Validar no cliente antes de enviar (mesmas regras do backend)
- Exibir erros inline sob cada campo
- Desabilitar botão de submit durante loading

### Formatação
- Valores monetários: `R$ 1.234,56` (locale pt-BR)
- Datas: `dd/MM/yyyy` (date-fns)
- Status: nunca exibir o código do enum — usar o mapa de labels

### Tipagem
- Todos os tipos do domínio ficam em `lib/types.ts`
- Espelham exatamente os contratos da API Go
- Nunca usar `any` — usar `unknown` se necessário

### Status visuais (AYD-002)

Rótulos e cores ficam em `lib/formatters.ts`; badges em `components/status-badges.tsx`.

| Enum | Valores (API → rótulo) |
|---|---|
| Entrega da venda (`delivery_status`, manual) | TO_DELIVER → A entregar (amarelo) · DELIVERED → Entregue (verde) · CANCELED → Cancelada (cinza; venda somente leitura) |
| Pagamento da venda (`payment_status`, calculado) | PENDING → Pendente · PARTIAL → Parcial · PAID → Quitado |
| Origem do item (`origin`) | MADE_TO_ORDER → Sob encomenda · FROM_STOCK → De estoque |
| Compra (`status`) | OPEN → Aberta · ORDERED → Pedida · RECEIVED → Recebida |
| Conta (`status`, calculado, AYD-007) | OPEN → Aberta · PARTIAL → Parcial · SETTLED → Quitada (+ selo "Vencida" quando `overdue`) |
| Parcela (`status`, calculado) | OPEN → Aberta · PARTIAL → Parcial · COVERED → Coberta |
| Tipo do fornecedor (`kind`) | STONE → Pedra · TRANSPORT → Transporte · LABOR → Mão de obra · TAX_AUTHORITY → Órgão de imposto · OTHER → Outro |
| Ajuste de estoque (`reason`) | INITIAL → Carga inicial · COUNT → Contagem · OTHER → Outro |
| Forma de pagamento (`payment_method`, AYD-004) | PIX → Pix · CASH → Dinheiro · CARD → Cartão · BOLETO → Boleto · TRANSFER → Transferência · null → Não informado |

### Padrões de UI (SPEC-013 / AYD-011 §9) e mesma experiência no celular
- Use os padrões de `components/patterns` e `components/entity`: `<select>` nativo, `<table>` fora do `DataTable`, cor crua do Tailwind (use tokens `text-success`, `bg-warning-subtle`…) e `window.confirm` são proibidos (lint: **erro** em `features/` e `components/patterns|entity`, aviso no legado)
- Seletor de entidade = `EntityCombobox` (com "＋ Criar" que seleciona o criado); diálogos = `ResponsiveDialog` (tela cheia no celular); confirmação do irreversível = `ConfirmDialog`/`useConfirm`
- Celular é critério de aceite (UX-P13): alvos ≥ 44 px, campos 16 px, sem rolagem lateral, esqueleto no lugar de spinner de página; filtros, abas e prévia na URL
- Regra de apresentação é função pura em `model.ts` com teste

## Variáveis de ambiente

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

> Todas prefixadas com `NEXT_PUBLIC_` — são expostas ao cliente (sem segredo).

## Como rodar localmente

```bash
npm install
cp .env.local.example .env.local
# preencher as variáveis
npm run dev
```

Qualidade (CI: lint → tsc → test → build): `npm run lint && npx tsc --noEmit && npm test && npm run build`.
E2E (Playwright, perfis desktop/iPhone/Pixel): `npm run build && npm start` e `npm run e2e`
(1ª vez: `npx playwright install`). Desempenho: `npm run lhci`. Decisões: TDR-001.

## Fases de implementação

| Fase | Arquivo | Escopo |
|---|---|---|
| 1 | `specs/phase-01-foundation.md` | Setup, Firebase Auth, layout protegido, tela de login |
| 2 | `specs/phase-02-catalogs.md` | CRUD: clientes, produtos, fornecedores, vendedores externos (hoje Parceiros — SPEC-003) |
| 3 | `specs/phase-03-sales.md` | Listagem, criação e detalhe de vendas |
| 4 | `specs/phase-04-financial-panel.md` | Painel de pagamentos, totais financeiros por venda |
| 5 | `specs/phase-05-dashboard.md` | Dashboard, KPIs, gráficos e alertas |
| 6 | `specs/phase-06-estoque.md` | Tela de estoque físico (substituída por SPEC-002: saldo calculado + ajustes) |

> As fases acima (`.claude/specs/`) são o plano histórico. As entregas atuais seguem as
> SPECs em `docs/specs/` (SPEC-001 Orçamentos, SPEC-002 Atendimento da venda, SPEC-003
> Cadastros comerciais, SPEC-004 Financeiro, SPEC-005 Dashboard, SPEC-006 Assistant connector, SPEC-008 Contas e movimentações, SPEC-009 Composição da compra, SPEC-010 Composição da venda, SPEC-011 Serviços na venda, SPEC-012 Vendas e orçamentos por cidade, **SPEC-013 Jornada do dono e UX (AYD-011) — fases U0–U5**).

## Deploy (Vercel — Free Tier)

- Conectar repositório GitHub ao Vercel
- Configurar variáveis de ambiente no painel
- Deploy automático a cada push na branch `main`

## This repo's role (docs framework)

I consume the AYD contracts (source of truth) from the context repo (`rochatto-app-context`).
If the backend diverges from the AYD, I flag it — I do not adapt silently.

## Engineering conventions (local)
@docs/conventions.md

## Docs framework (summary)

How this repo connects to the shared context (`rochatto-app-context`). The **full rules**
live in the linked files — this is just the essentials.

- **READ-ONLY context:** run `docs/scripts/sync-context.sh` to populate `docs/shared/`
  (a **gitignored** mirror of the context repo — **do not edit here**). Map and rules:
  @docs/shared/CLAUDE.md (IDs, frontmatter, lifecycle, `ID@repo` refs) ·
  @docs/shared/requirements.md (requirements **and glossary** — ALWAYS use these terms).
- **What lives in this repo:** `docs/specs/` (SPEC — already includes the implementation
  plan: approach, steps, tests, checklist), `docs/technical_decisions/` (local TDR),
  `docs/conventions.md` (CONV), `docs/changelog.md`.
- **Contracts only change in the context** (AYD/ADR). If this frontend diverges from the AYD,
  **flag it** — do not adapt locally (see `docs/shared/CLAUDE.md`, "Core rule").
- **Feature flow:** read the AYD in `docs/shared/design/` → create/update the SPEC
  (`parents: [AYD-NNN@context]`, covers what + how) and implement → contract changed? go
  back to the AYD in the context repo before proceeding.
