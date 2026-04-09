# CLAUDE.md — Frontend: Sistema de Gestão de Vendas

## O que é este componente

Interface web em **Next.js 14** (App Router) que serve como ponto de interação do usuário com o sistema de gestão de vendas. Autentica via Google Login (Firebase Auth), consome a API REST do backend Go e exibe dashboards, formulários e listagens.

## Objetivo

Fornecer uma interface funcional, limpa e responsiva para:
- Login seguro via conta Google
- Cadastro e consulta de clientes, produtos, fornecedores e vendedores externos
- Criação e gerenciamento completo de vendas com múltiplos itens
- Controle de recebimentos do cliente (parciais, agendados, confirmados)
- Visualização de indicadores financeiros no dashboard
- Controle de alertas de pagamentos pendentes
- Módulo de estoque físico

## Stack

| Tecnologia | Versão | Papel |
|---|---|---|
| Next.js | 14+ (App Router) | Framework React com SSR/RSC |
| React | 18+ | UI library |
| TypeScript | 5+ | Tipagem estática |
| Tailwind CSS | 3+ | Estilização utilitária |
| shadcn/ui | latest | Componentes de UI acessíveis |
| Firebase Auth | 10+ | Autenticação Google Login |
| Recharts | 2+ | Gráficos do dashboard |
| React Hook Form | 7+ | Gerenciamento de formulários |
| Zod | 3+ | Validação de schema |
| SWR | 2+ | Data fetching e cache |
| date-fns | 3+ | Formatação de datas |

## Arquitetura

```
App Router do Next.js — sem backend próprio (nenhuma Server Action ou Route Handler).
Toda a lógica de dados vai para a API Go via fetch no cliente.
```

```
app/
  (auth)/login/              → tela pública de login
  (app)/                     → layout protegido (redireciona se não autenticado)
    dashboard/               → página inicial — KPIs e alertas
    vendas/                  → listagem, criação, detalhe
    clientes/                → CRUD de clientes
    estoque/                 → controle de estoque
    catalogos/               → produtos, fornecedores, vendedores externos
components/
  ui/                        → shadcn/ui (nunca editar diretamente)
  forms/                     → formulários reutilizáveis
  tables/                    → tabelas de listagem
  dashboard/                 → cards e gráficos
lib/
  api.ts                     → fetch wrapper autenticado
  firebase.ts                → configuração do Firebase
  formatters.ts              → formatação de moeda, data, status
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

### Status visual das vendas

| Status (API) | Label | Cor de fundo |
|---|---|---|
| A_ENTREGAR | A Entregar | Amarelo — `bg-yellow-100` |
| A_ENTREGAR_DATA | A Entregar em {data} | Amarelo — `bg-yellow-100` |
| A_RETIRAR | A Retirar no Depósito | Laranja — `bg-orange-100` |
| ENTREGUE_PARCIAL | Entregue Parcialmente | Azul — `bg-blue-100` |
| ENTREGUE | Entregue | Verde — `bg-green-100` |

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

## Fases de implementação

| Fase | Arquivo | Escopo |
|---|---|---|
| 1 | `specs/phase-01-foundation.md` | Setup, Firebase Auth, layout protegido, tela de login |
| 2 | `specs/phase-02-catalogs.md` | CRUD: clientes, produtos, fornecedores, vendedores externos |
| 3 | `specs/phase-03-sales.md` | Listagem, criação e detalhe de vendas |
| 4 | `specs/phase-04-financial-panel.md` | Painel de pagamentos, totais financeiros por venda |
| 5 | `specs/phase-05-dashboard.md` | Dashboard, KPIs, gráficos e alertas |
| 6 | `specs/phase-06-estoque.md` | Tela de estoque físico |

## Deploy (Vercel — Free Tier)

- Conectar repositório GitHub ao Vercel
- Configurar variáveis de ambiente no painel
- Deploy automático a cada push na branch `main`
