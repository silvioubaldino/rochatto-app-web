---
id: TDR-001
type: tdr
title: Fundação de UI e de testes do web — Vitest + Testing Library + MSW, Playwright + axe, Lighthouse CI, pastas por feature e invalidação por eventos
status: proposed
updated: 2026-11-22
parents: [SPEC-013]
related: [AYD-011@context, ADR-001@context]
superseded_by: null
---

# TDR-001: Fundação de UI e de testes do web

> Append-only: nunca reescreva. Decisão nova = novo TDR que substitui este.
> Decisão interna DESTE repo (o AYD-011 §9 só exige o resultado; a escolha das ferramentas
> é local — AYD-011 §9.5 e §9.4 regra 8).

## Contexto

O web chegou ao AYD-011 com 4 páginas de 570–750 linhas, 6 autocompletes manuais, ~45
`<select>` nativos, 18 tabelas escritas à mão, ~110 classes de cor crua, `api.*` chamado direto
de componentes com invalidação de cache ad-hoc (`isAccountingKey`, `isPurchaseRelatedKey`) e
**nenhum teste** (CI = lint + tsc + build). A UX nova (AYD-011) exige:

- uma **base de componentes** reutilizável (U1) sobre a qual U2–U5 são construídas, em
  paralelo, por pessoas/agentes diferentes;
- **a mesma experiência no navegador do celular** (UX-P13) como critério de aceite
  verificável — toque ≥ 44 px, sem rolagem lateral, INP/LCP/CLS medidos;
- regras de apresentação (próximo passo, presets de parcela, tom de status) com rede de testes.

Restrições: free tier / custo próximo de zero; Next.js 16 (App Router, React 19, Turbopack),
SWR, RHF + zod, Base UI/shadcn; CI no GitHub Actions; ESM; sem backend próprio no web.

## Decisão

### 1. Testes

| Nível | Ferramenta | Por quê |
|-------|-----------|---------|
| Unitário e componente | **Vitest 3** + **Testing Library** (`@testing-library/react`, `user-event`, `jest-dom`) em **jsdom** | Mesma API do Jest, ESM/TypeScript nativos e sem transform extra (esbuild, JSX automático); o `next/jest` traria SWC + config a mais para um app sem SSR de dados. |
| Rede simulada | **MSW 2** (`msw/node`) na **fronteira de rede**; só o Firebase é mockado (`vi.mock("@/lib/firebase")`) | Os testes exercitam o cliente HTTP real (`lib/http`, token, `ApiError`, SWR) contra respostas controladas — "mockar só na fronteira, não a unidade testada" (conventions). |
| Ponta a ponta | **Playwright** + **@axe-core/playwright**, projetos `desktop` (Chrome), `iphone` (WebKit, iPhone 14) e `pixel` (Chromium, Pixel 7) | A paridade de experiência é testada com a **mesma suíte** nos três perfis (mesma contagem de passos, `scrollWidth ≤ clientWidth`, alvos ≥ 44 px, axe sem violação séria). WebKit cobre o Safari do iPhone. A api é simulada (MSW no servidor de teste, na fase U2+, quando as tarefas-ouro entram). |
| Desempenho | **Lighthouse CI** (`@lhci/cli` via `npx`, sem dependência no `package.json`) em perfil de celular (4× CPU, 150 ms RTT, 1,6 Mbps) + métricas reais depois (`web-vitals`) | Orçamentos de UX-P13: LCP ≤ 2,5 s, CLS ≤ 0,1; INP (≤ 200 ms) só existe em campo/Playwright — entra como métrica real em U2. |

Convenções: `*.test.ts(x)` ao lado do código; regra de apresentação em `model.ts` /
`*-model.ts` **puro** (sem React) com teste unitário; `tests/` guarda só setup e handlers MSW;
`e2e/` guarda Playwright. `npm test` = `vitest run`. Dependência `@testing-library/jest-dom@6`
(a 8 exige vitest 5, incompatível com o `@types/node@20` fixado pelo Firebase).

### 2. CI

`lint` (com as regras do AYD-011 §9.4) → `tsc --noEmit` → `npm test` → `build`, bloqueantes.
Jobs `e2e` e `performance` (artefato do build) rodam em paralelo e são **informativos**
(`continue-on-error`) até existirem tarefas-ouro/rotas a medir (U2+); a partir daí bloqueiam o PR.

### 3. Estrutura de pastas por feature

`app/(app)/<rota>/page.tsx` só compõe; `features/<domínio>/{api,queries,mutations,schemas,model,components,previews}`;
`components/{ui,patterns,entity}`; `lib/{http,errors,format,events,mutation,history}`.
Dependências só descem (`app → features → components/{entity,patterns} → components/ui → lib`);
uma feature não importa outra. `components/entity` não conhece features: formulários de criação
rápida e prévias de entidade **se registram** (`registerQuickCreate`, `registerPreview`) num
módulo de composição (`features/register.ts`) importado uma vez pelo layout. `components/ui`
(shadcn) só é editado para as **variantes de toque do celular** (`h-11 md:h-8`, `text-base md:text-sm`).

### 4. Invalidação por eventos de domínio (SWR)

Toda mutação declara **eventos** (`SALE_CHANGED`, `QUOTE_CHANGED`, `PURCHASE_CHANGED`,
`MONEY_MOVED`, `STOCK_CHANGED`, `CATALOG_CHANGED`, `CUSTOMER_CHANGED`, `PARTNER_CHANGED`,
`SUPPLIER_CHANGED`); `lib/events.ts` é a **fonte única** do mapa evento → prefixos de chave
(as chaves SWR são os próprios caminhos da api) e `useEmit()` revalida via `mutate(filtro)`.
`useApiMutation` junta escrita + eventos + toast. O que cruza domínios (ex.: pagar muda Sale,
Purchase, painéis) fica **declarado num lugar**, testado, em vez de espalhado por telas.

### 5. Regras de código verificadas por lint

`no-restricted-syntax` (`<select>` nativo, `<table>` fora do `DataTable`, cor crua do
Tailwind em `className`/template) e `no-restricted-imports` (`@/lib/http|api` em componente):
**erro** em `features/` e `components/patterns|entity`; **aviso** nas telas legadas
(`app/`, `components/`, `hooks/`), para o build passar durante a migração incremental (AYD §9.6).
Exceções documentadas: `DataTable` (única `<table>`), `*queries.ts` / `mutations.ts` (única
camada que fala com a api).

### 6. Biblioteca de UI

Primitivas **Base UI** (já em uso): `Dialog`, `AlertDialog`, `Select`, `Tabs`. O
`EntityCombobox` é próprio sobre o padrão ARIA combobox (`listbox` + `aria-activedescendant`),
porque precisa de "＋ Criar" como última linha, recentes, filtro/preferência por contexto e
busca assíncrona com `keepPreviousData` — mais direto de controlar e de testar em jsdom que o
`Combobox` do Base UI. `ResponsiveDialog` usa **um só DOM** (CSS `md:`) — tela cheia no celular,
caixa no desktop — para não piscar ao girar o aparelho. Tipos de domínio seguem em
`lib/types.ts` (espelham a api); geração a partir de `docs/swagger.yaml` **não** foi adotada
(o arquivo está defasado em relação à api — não traz `/partners`, `/services`, contas etc.).

## Alternativas & trade-offs

- **Jest + `next/jest`:** ecossistema maior, porém SWC + transform e mocks ESM mais frágeis; Vitest é mais rápido e não exige config do Next. Perda: nenhuma relevante aqui.
- **Cypress** em vez de Playwright: sem WebKit estável/gratuito para o perfil iPhone; Playwright roda os três perfis com a mesma suíte e axe oficial.
- **MSW × mock de `fetch`/`api`:** MSW custa um servidor de handlers, mas testa o cliente real e serve igual a Node (testes) e ao navegador/servidor de e2e. Mockar `lib/api` esconderia bugs de token/erro.
- **Storybook/Chromatic:** bom para catálogo visual, mas custo/serviço extra; os testes de componente + e2e cobrem o comportamento, e a página real é o catálogo. Reavaliar se o time crescer.
- **Combobox do Base UI** para o `EntityCombobox`: menos código de ARIA, mas "criar" como linha da lista e a ordenação por contexto exigiriam contornar a API; escolhemos controlar.
- **Zustand/Redux** para invalidação/estado: descartado (CLAUDE.md: "sem estado global além de SWR e URL"); eventos + `mutate(filtro)` do SWR resolvem.
- **`useEffect` para sincronizar estado** (ex.: rascunho do filtro ← URL): evitado; usa-se ajuste de estado durante o render (React Compiler/lint `set-state-in-effect`).
- **Lighthouse CI bloqueante já em U1:** rejeitado — não há rotas das tarefas-ouro ainda; medir só `/login` daria falsa segurança. Fica informativo e passa a bloquear em U2+.
- **Risco aceito:** `QuickCreate` empilha diálogos modais (Base UI) em portais irmãos; o foco entre eles precisa de teste e2e na fase U3 (Fechar venda → criar credor).
